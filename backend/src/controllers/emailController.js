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

// ZyraVoice manda un evento por destinatario de la campaña. Si organization_id
// no está mapeado a ningún Project, o el email no coincide con ningún cliente
// del CRM dentro de ese proyecto, no se crea nada — nunca se falla la
// petición — pero queda anotado en el log para poder auditar el hueco.
async function handleEmailSent(req, res) {
  const { delivery_id: deliveryId, organization_id: organizationId, subject, email, sent_at: sentAt } = req.body;

  const project = await prisma.project.findUnique({ where: { zyraOrganizationId: organizationId } });
  if (!project) {
    console.log(`[emails] organization_id=${organizationId} no está mapeado a ningún Project (configúralo en Project.zyraOrganizationId)`);
    return res.json({ existing: false, clientId: null, skipped: true });
  }

  const emailNormalized = normalizeEmailOrNull(email);
  const existingClient = emailNormalized
    ? await prisma.client.findFirst({ where: { emailNormalized, projectId: project.id } })
    : null;

  if (!existingClient) {
    console.log(`[emails] Sin coincidencia para email=${emailNormalized ?? '(vacío)'} en projectId=${project.id} (organization_id=${organizationId})`);
    return res.json({ existing: false, clientId: null, skipped: true });
  }

  const systemUser = await findSystemUser();
  if (!systemUser) {
    return res.status(500).json({ error: 'No hay usuario Sistema/Admin configurado para atribuir la interacción' });
  }

  // El registro de dedupe (por delivery_id, determinístico entre reintentos de
  // ZyraVoice) va en la MISMA transacción que la interacción: si ya se procesó,
  // el create de webhookEvent lanza P2002 y revierte todo (nada se duplica); si
  // algo más falla, el rollback también deshace el registro, así un reintento
  // real de ZyraVoice no queda bloqueado como si ya se hubiera procesado cuando
  // en realidad nunca se completó.
  try {
    await prisma.$transaction([
      prisma.webhookEvent.create({ data: { source: 'zyravoice.email_sent', externalId: String(deliveryId) } }),
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
