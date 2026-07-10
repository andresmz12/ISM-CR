const prisma = require('../config/prisma');

// Registra un evento de webhook externo como ya procesado. Devuelve `false` si el
// evento (source+externalId) ya existía — el caller debe responder 200 sin repetir
// efectos secundarios (interacciones, auditoría, asignación) en vez de tratarlo
// como error. Se apoya en la restricción unique(source, externalId) en vez de un
// SELECT-then-INSERT para que sea atómico bajo reintentos concurrentes del emisor.
async function recordWebhookEventOnce(source, externalId) {
  try {
    await prisma.webhookEvent.create({ data: { source, externalId: String(externalId) } });
    return true;
  } catch (err) {
    if (err.code === 'P2002') return false;
    throw err;
  }
}

module.exports = { recordWebhookEventOnce };
