const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

function normalizeEmailOrNull(e) {
  const n = String(e ?? '').trim().toLowerCase();
  return n || null;
}

async function findSystemUser() {
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  return (await prisma.user.findUnique({ where: { email: systemEmail } }))
    ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));
}

// ZyraVoice manda un evento por destinatario de la campaña. Si el email no
// coincide con ningún cliente del CRM (dentro del proyecto indicado), no se
// crea nada — se asume que el destinatario no es un cliente del CRM, no un
// error — pero queda anotado en el log para poder auditar coincidencias faltantes.
async function handleEmailSent(req, res) {
  const { email, subject, sent_at: sentAt, projectId } = req.body;
  const emailNormalized = normalizeEmailOrNull(email);

  const existingClient = emailNormalized
    ? await prisma.client.findFirst({ where: { emailNormalized, projectId } })
    : null;

  if (!existingClient) {
    // Nada que persistir: no hace falta dedupe, un reintento vuelve a calcular
    // exactamente la misma respuesta sin efectos secundarios.
    console.log(`[emails] Sin coincidencia para email=${emailNormalized ?? '(vacío)'} en projectId=${projectId}`);
    return res.json({ existing: false, clientId: null, skipped: true });
  }

  const systemUser = await findSystemUser();
  if (!systemUser) {
    return res.status(500).json({ error: 'No hay usuario Sistema/Admin configurado para atribuir la interacción' });
  }

  // No hay un id de mensaje propio en el payload (email+subject+sent_at), así que
  // esa combinación es la clave de dedupe. El registro va en la MISMA transacción
  // que la interacción: si ya se procesó, el create de webhookEvent lanza P2002 y
  // revierte todo (nada se duplica); si algo más falla, el rollback también
  // deshace el registro, así un reintento real de ZyraVoice no queda bloqueado
  // como si ya se hubiera procesado cuando en realidad nunca se completó.
  const dedupeKey = `${projectId}:${emailNormalized}:${subject}:${sentAt}`;
  try {
    await prisma.$transaction([
      prisma.webhookEvent.create({ data: { source: 'zyravoice.email_sent', externalId: dedupeKey } }),
      prisma.interaction.create({
        data: {
          clientId: existingClient.id,
          userId: systemUser.id,
          type: 'EMAIL',
          notes: `[ZyraVoice] Campaña de email enviada — asunto: ${subject}`,
          createdAt: new Date(sentAt),
        },
      }),
      prisma.client.update({ where: { id: existingClient.id }, data: { lastContactedAt: new Date(sentAt) } }),
    ]);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.json({ existing: true, duplicate: true });
    }
    throw err;
  }

  res.json({ existing: true, clientId: existingClient.id });
}

module.exports = wrapAll({ handleEmailSent });
