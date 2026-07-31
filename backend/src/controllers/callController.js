const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

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
  const norm = normalizePhoneOrNull(prospect.phone);
  const existingClient = norm
    ? await prisma.client.findFirst({ where: { OR: [{ phoneNormalized: norm }, { phoneAltNormalized: norm }] } })
    : null;

  if (!existingClient) {
    // TEMPORAL — diagnóstico de qué pasa con los 200 en prod, quitar una vez confirmado.
    console.log(`[calls][DEBUG TEMPORAL] skipped=true, sin cliente para phone normalizado="${norm}", call.id=${call?.id}`);
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
      // TEMPORAL — diagnóstico de qué pasa con los 200 en prod, quitar una vez confirmado.
      console.log(`[calls][DEBUG TEMPORAL] duplicate=true (call.id=${call?.id} ya procesado), clientId=${existingClient.id}`);
      return res.json({ existing: true, duplicate: true });
    }
    throw err;
  }

  // TEMPORAL — diagnóstico de qué pasa con los 200 en prod, quitar una vez confirmado.
  console.log(`[calls][DEBUG TEMPORAL] Interaction creada, clientId=${existingClient.id}, call.id=${call?.id}`);
  res.json({ existing: true, clientId: existingClient.id });
}

module.exports = wrapAll({ handleCallEnded });
