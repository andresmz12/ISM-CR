const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { normalizePhoneOrNull } = require('../utils/phone');

async function findSystemUser() {
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  return (await prisma.user.findUnique({ where: { email: systemEmail } }))
    ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));
}

// ZyraVoice no manda un campo dedicado para la dirección confirmada por el
// cliente — se busca en `summary` el patrón "dirección...: <texto>". Es un
// heurístico frágil (depende de cómo ZyraVoice redacte el resumen); si no
// matchea, simplemente no hay línea de dirección, no se inventa nada.
// Captura hasta fin de línea (no hasta el primer ".") porque direcciones con
// abreviaturas ("Av.", "No.") cortarían la captura a la mitad si se parara
// en el punto.
function extractConfirmedAddress(call) {
  const match = String(call.summary ?? '').match(/direcci[oó]n[^:]*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function buildCallNotes(call) {
  const outcome = call.outcome ?? 'desconocido';
  const address = extractConfirmedAddress(call);
  if (!address) {
    return `[ZyraVoice] Llamada realizada — ${outcome}`;
  }
  return `[ZyraVoice] Llamada confirmada — ${outcome}\n📍 Dirección confirmada: ${address}`;
}

// La llamada la origina ZyraVoice desde su propia lista de prospectos: si el
// teléfono no coincide con ningún cliente del CRM, no se crea uno nuevo (ver
// plan) — se asume un hueco de sincronización, no un lead genuino.
async function handleCallEnded(req, res) {
  const { prospect, call } = req.body;
  const norm = normalizePhoneOrNull(prospect.phone);
  const existingClient = norm
    ? await prisma.client.findFirst({ where: { OR: [{ phoneNormalized: norm }, { phoneAltNormalized: norm }] } })
    : null;

  if (!existingClient) {
    // Nada que persistir: no hace falta dedupe, un reintento vuelve a calcular
    // exactamente la misma respuesta sin efectos secundarios.
    return res.json({ existing: false, clientId: null, skipped: true });
  }

  const systemUser = await findSystemUser();
  if (!systemUser) {
    return res.status(500).json({ error: 'No hay usuario Sistema/Admin configurado para atribuir la interacción' });
  }

  try {
    // El registro de dedupe va en la MISMA transacción que la interacción: si
    // call.id ya se procesó, el create de webhookEvent lanza P2002 y revierte
    // toda la transacción (nada se duplica). Si algo más de la transacción
    // falla, el rollback también deshace el registro de dedupe — así un
    // reintento real de ZyraVoice (ante un 5xx) no queda bloqueado como si ya
    // se hubiera procesado cuando en realidad nunca se completó.
    await prisma.$transaction([
      prisma.webhookEvent.create({ data: { source: 'zyravoice.call_ended', externalId: String(call.id) } }),
      prisma.interaction.create({
        data: {
          clientId: existingClient.id,
          userId: systemUser.id,
          type: 'CALL',
          notes: buildCallNotes(call),
        },
      }),
      prisma.client.update({ where: { id: existingClient.id }, data: { lastContactedAt: new Date() } }),
    ]);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.json({ existing: true, duplicate: true });
    }
    throw err;
  }

  res.json({ existing: true, clientId: existingClient.id });
}

module.exports = wrapAll({ handleCallEnded });
