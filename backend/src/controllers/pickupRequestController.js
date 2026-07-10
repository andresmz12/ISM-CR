const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { fetchPickupRequestDetail, RecogidaPaqApiError } = require('../services/recogidaPaqClient');

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

async function findSystemUser() {
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  return (await prisma.user.findUnique({ where: { email: systemEmail } }))
    ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));
}

async function handlePickupRequest(req, res) {
  const { eventType, pickupRequestId, trackingCode, status: webhookStatus } = req.body;

  let detail;
  try {
    detail = await fetchPickupRequestDetail(pickupRequestId);
  } catch (err) {
    if (err instanceof RecogidaPaqApiError) {
      return res.status(502).json({ error: 'No se pudo obtener el detalle de RECOGIDA-PAQ' });
    }
    throw err;
  }

  const statusValue = detail.status ?? webhookStatus;
  const statusName = STATUS_MAP[statusValue];
  if (!statusName) {
    return res.status(400).json({ error: `Estatus desconocido: ${statusValue}` });
  }

  const contactName = detail.contactName;
  const contactPhone = detail.contactPhone;
  const address = detail.address;
  if (!contactName || !contactPhone) {
    return res.status(400).json({ error: 'RECOGIDA-PAQ no devolvió contactName/contactPhone' });
  }

  const norm = normalizePhoneOrNull(contactPhone);
  const existingClient = norm
    ? await prisma.client.findFirst({ where: { OR: [{ phoneNormalized: norm }, { phoneAltNormalized: norm }] } })
    : null;
  const systemUser = await findSystemUser();

  const result = await prisma.$transaction(async (tx) => {
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
        data: { address, statusId: status.id, lastContactedAt: new Date() },
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
          address,
          statusId: status.id,
          source: 'RECOGIDA-PAQ',
          lastContactedAt: new Date(),
          projectId: process.env.RECOGIDA_PAQ_PROJECT_ID || undefined,
        },
      });
    }

    if (systemUser) {
      await tx.interaction.create({
        data: {
          clientId: client.id,
          userId: systemUser.id,
          type: 'VISIT',
          notes: `[RECOGIDA-PAQ] ${eventType} — tracking ${trackingCode}, estatus ${statusValue}`,
          resultStatusId: status.id,
        },
      });
    }

    return { client, status };
  });

  res.json({ existing: Boolean(existingClient), clientId: result.client.id, statusId: result.status.id });
}

module.exports = wrapAll({ handlePickupRequest });
