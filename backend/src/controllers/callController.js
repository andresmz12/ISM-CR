const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { recordWebhookEventOnce } = require('../utils/webhookDedupe');

function normalizePhoneOrNull(p) {
  const n = String(p ?? '').replace(/\D/g, '');
  return n || null;
}

async function findSystemUser() {
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  return (await prisma.user.findUnique({ where: { email: systemEmail } }))
    ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));
}

function buildCallNotes(call) {
  const lines = [
    `[ZyraVoice] Llamada finalizada — resultado: ${call.outcome ?? 'desconocido'}, sentimiento: ${call.sentiment ?? 'desconocido'}`,
    call.appointment_scheduled ? `Cita agendada: ${call.appointment_date ?? 'fecha no especificada'}` : 'Sin cita agendada',
    call.summary ? `Resumen: ${call.summary}` : null,
    call.recording_url ? `Grabación: ${call.recording_url}` : null,
    Array.isArray(call.client_said) && call.client_said.length > 0
      ? `Cliente dijo: ${call.client_said.map((s) => `"${s}"`).join(' | ')}`
      : null,
    Array.isArray(call.agent_said) && call.agent_said.length > 0
      ? `Agente dijo: ${call.agent_said.map((s) => `"${s}"`).join(' | ')}`
      : null,
  ];
  return lines.filter(Boolean).join('\n');
}

// La llamada la origina ZyraVoice desde su propia lista de prospectos: si el
// teléfono no coincide con ningún cliente del CRM, no se crea uno nuevo (ver
// plan) — se asume un hueco de sincronización, no un lead genuino.
async function handleCallEnded(req, res) {
  const { prospect, call } = req.body;

  // ZyraVoice reintenta el webhook si no recibe 2xx a tiempo; sin esto, un
  // reintento duplicaría la interacción de la llamada cada vez.
  const isNewEvent = await recordWebhookEventOnce('zyravoice.call_ended', call.id);
  if (!isNewEvent) {
    return res.json({ existing: true, duplicate: true });
  }

  const norm = normalizePhoneOrNull(prospect.phone);
  const existingClient = norm
    ? await prisma.client.findFirst({ where: { OR: [{ phoneNormalized: norm }, { phoneAltNormalized: norm }] } })
    : null;

  if (!existingClient) {
    return res.json({ existing: false, clientId: null, skipped: true });
  }

  const systemUser = await findSystemUser();
  if (!systemUser) {
    return res.status(500).json({ error: 'No hay usuario Sistema/Admin configurado para atribuir la interacción' });
  }

  await prisma.$transaction([
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

  res.json({ existing: true, clientId: existingClient.id });
}

module.exports = wrapAll({ handleCallEnded });
