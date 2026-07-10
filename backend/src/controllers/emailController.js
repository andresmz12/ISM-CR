const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { recordWebhookEventOnce } = require('../utils/webhookDedupe');

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

  // ZyraVoice reintenta el webhook si no recibe 2xx a tiempo; sin esto, un
  // reintento duplicaría la interacción del envío cada vez.
  const isNewEvent = await recordWebhookEventOnce('zyravoice.email_sent', `${projectId}:${normalizeEmailOrNull(email)}:${subject}:${sentAt}`);
  if (!isNewEvent) {
    return res.json({ existing: true, duplicate: true });
  }

  const emailNormalized = normalizeEmailOrNull(email);
  const existingClient = emailNormalized
    ? await prisma.client.findFirst({ where: { emailNormalized, projectId } })
    : null;

  if (!existingClient) {
    console.log(`[emails] Sin coincidencia para email=${emailNormalized ?? '(vacío)'} en projectId=${projectId}`);
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
        type: 'EMAIL',
        notes: `[ZyraVoice] Campaña de email enviada — asunto: ${subject}`,
        createdAt: new Date(sentAt),
      },
    }),
    prisma.client.update({ where: { id: existingClient.id }, data: { lastContactedAt: new Date(sentAt) } }),
  ]);

  res.json({ existing: true, clientId: existingClient.id });
}

module.exports = wrapAll({ handleEmailSent });
