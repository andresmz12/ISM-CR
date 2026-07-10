const express = require('express');
const { z } = require('zod');
const { requireWebhookSignature } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { handleEmailSent } = require('../controllers/emailController');

const router = express.Router();

const emailWebhookSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1),
  sent_at: z.string().min(1),
  // Nuestro projectId interno (no un ID de ZyraVoice): identifica de qué empresa/
  // proyecto es la campaña, para no matchear el email contra clientes de otro
  // proyecto que use la misma integración de ZyraVoice.
  projectId: z.string().uuid(),
});

/**
 * @openapi
 * /integrations/emails:
 *   post:
 *     summary: Webhook de ZyraVoice cuando se envía un email de una campaña de marketing
 *     tags: [Integrations]
 *     security: [{ zyraWebhookSignature: [] }]
 *     responses:
 *       200: { description: Interacción registrada, o "skipped" si no hay cliente con ese email en el proyecto }
 *       401: { description: Firma inválida }
 */
router.post(
  '/',
  requireWebhookSignature({ headerName: 'x-zyravoice-signature', secretEnvVar: 'ZYRA_CRM_WEBHOOK_SECRET', prefix: 'sha256=' }),
  validate(emailWebhookSchema),
  handleEmailSent
);

module.exports = router;
