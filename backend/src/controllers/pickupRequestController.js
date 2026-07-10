const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { fetchPickupRequestDetail, RecogidaPaqApiError } = require('../services/recogidaPaqClient');
const { pickAutoAssignAgent } = require('../utils/autoAssign');
const { recordWebhookEventOnce } = require('../utils/webhookDedupe');

const STATUS_MAP = {
  PENDING: 'Pendiente de recogida',
  PICKED_UP: 'Recogido',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado',
  FAILED: 'Fallido',
};

function normalizePhoneOrNull(p) {
  const n = String(p ?? '').replace(/\D/g, '');
  return n || null;
}

// RECOGIDA-PAQ manda la dirección partida en varios campos (calle, ciudad,
// estado, código postal) en vez de un string único — se concatena con comas,
// omitiendo silenciosamente las partes que no vengan.
function formatAddress(...parts) {
  return parts.filter(Boolean).join(', ');
}

function buildPickupNotes({ event, trackingCode, statusValue, pickupAddressFull, recipientName, recipientAddressFull, recipientPhone }) {
  const lines = [
    `[RECOGIDA-PAQ] ${event} — tracking ${trackingCode}, estatus ${statusValue}`,
    pickupAddressFull ? `Dirección de recogida: ${pickupAddressFull}` : null,
    (recipientName || recipientAddressFull)
      ? `Destinatario: ${recipientName ?? 'sin nombre'} — ${recipientAddressFull || 'sin dirección'}${recipientPhone ? ` (tel: ${recipientPhone})` : ''}`
      : null,
  ];
  return lines.filter(Boolean).join('\n');
}

async function findSystemUser() {
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  return (await prisma.user.findUnique({ where: { email: systemEmail } }))
    ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));
}

async function handlePickupRequest(req, res) {
  const { event, pickupRequestId, trackingCode, status: webhookStatus, deliveryId } = req.body;

  // RECOGIDA-PAQ reintenta el webhook ante timeouts/5xx; deliveryId identifica la
  // entrega del webhook en sí (no el pickup), así que dedupe por él evita volver a
  // crear la interacción/auditoría de un mismo evento reenviado.
  const isNewEvent = await recordWebhookEventOnce('recogidapaq.pickup_request', deliveryId);
  if (!isNewEvent) {
    return res.json({ duplicate: true });
  }

  let detail;
  try {
    detail = await fetchPickupRequestDetail(pickupRequestId);
  } catch (err) {
    if (err instanceof RecogidaPaqApiError) {
      // Diagnóstico de errores 5xx al llamar a RECOGIDA-PAQ: se registra la causa
      // (status HTTP, mensaje) sin volcar el responseBody crudo, que puede traer
      // la propia API key o datos del contacto en el mensaje de error de RECOGIDA-PAQ.
      console.error(
        `[pickup-requests] 502 al llamar a RECOGIDA-PAQ — url=${err.url}, status=${err.status ?? 'sin respuesta HTTP'}, ` +
        `message=${err.message}, pickupRequestId=${pickupRequestId}`
      );
      return res.status(502).json({ error: 'No se pudo obtener el detalle de RECOGIDA-PAQ' });
    }
    throw err;
  }

  const statusValue = detail.status ?? webhookStatus;
  const statusName = STATUS_MAP[statusValue];
  if (!statusName) {
    const error = `Estatus desconocido: ${statusValue}`;
    // No se loguea `detail` completo: trae nombre/teléfono/dirección del contacto y destinatario (PII).
    console.error(`[pickup-requests] 400: ${error} — pickupRequestId=${pickupRequestId}`);
    return res.status(400).json({ error });
  }

  const contactName = detail.contactName;
  const contactPhone = detail.contactPhone;
  const pickupAddressFull = formatAddress(detail.pickupAddress, detail.pickupCity, detail.pickupState, detail.pickupPostalCode);
  const recipientAddressFull = formatAddress(detail.recipientAddress, detail.recipientCity, detail.recipientState);
  const recipientName = detail.recipientName;
  const recipientPhone = detail.recipientPhone;
  if (!contactName || !contactPhone) {
    const error = 'RECOGIDA-PAQ no devolvió contactName/contactPhone';
    console.error(`[pickup-requests] 400: ${error} — pickupRequestId=${pickupRequestId}, camposRecibidos=${Object.keys(detail).join(',')}`);
    return res.status(400).json({ error });
  }

  const norm = normalizePhoneOrNull(contactPhone);
  const existingClient = norm
    ? await prisma.client.findFirst({ where: { OR: [{ phoneNormalized: norm }, { phoneAltNormalized: norm }] } })
    : null;
  const systemUser = await findSystemUser();

  const result = await prisma.$transaction(async (tx) => {
    // Round-robin solo para clientes nuevos — uno ya existente nunca cambia de agente
    // por este webhook. Se elige dentro de la misma transacción que crea el cliente,
    // bajo el advisory lock de pickAutoAssignAgent, para que dos webhooks concurrentes
    // no se asignen al mismo agente (ver autoAssign.js).
    const autoAssignedAgentId = existingClient ? undefined : ((await pickAutoAssignAgent(tx)) ?? undefined);

    let status = await tx.status.findUnique({ where: { name: statusName } });
    if (!status) {
      const maxOrder = await tx.status.aggregate({ _max: { order: true } });
      status = await tx.status.create({
        data: { name: statusName, order: (maxOrder._max.order ?? 0) + 1, isDefault: false },
      });
    }

    let client;
    if (existingClient) {
      const statusChanged = status.id !== existingClient.statusId;
      client = await tx.client.update({
        where: { id: existingClient.id },
        data: {
          address: pickupAddressFull,
          recipientName,
          recipientAddress: recipientAddressFull,
          statusId: status.id,
          lastContactedAt: new Date(),
        },
      });
      if (statusChanged) {
        await tx.auditLog.create({
          data: {
            clientId: client.id,
            userId: systemUser?.id,
            field: 'statusId',
            oldValue: existingClient.statusId,
            newValue: status.id,
          },
        });
      }
    } else {
      client = await tx.client.create({
        data: {
          fullName: contactName,
          phone: contactPhone,
          phoneNormalized: norm,
          address: pickupAddressFull,
          recipientName,
          recipientAddress: recipientAddressFull,
          statusId: status.id,
          source: 'RECOGIDA-PAQ',
          lastContactedAt: new Date(),
          projectId: process.env.RECOGIDA_PAQ_PROJECT_ID || undefined,
          assignedAgentId: autoAssignedAgentId,
        },
      });
    }

    if (systemUser) {
      await tx.interaction.create({
        data: {
          clientId: client.id,
          userId: systemUser.id,
          type: 'VISIT',
          notes: buildPickupNotes({ event, trackingCode, statusValue, pickupAddressFull, recipientName, recipientAddressFull, recipientPhone }),
          resultStatusId: status.id,
        },
      });
    }

    return { client, status };
  });

  res.json({ existing: Boolean(existingClient), clientId: result.client.id, statusId: result.status.id });
}

module.exports = wrapAll({ handlePickupRequest });
