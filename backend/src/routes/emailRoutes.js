const express = require('express');
const { z } = require('zod');
const { requireWebhookSignature } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { handleEmailSent } = require('../controllers/emailController');

const router = express.Router();

const emailWebhookSchema = z.object({
  // Identifica el envío en sí (determinístico entre reintentos de ZyraVoice):
  // es la clave de dedupe contra WebhookEvent.
  delivery_id: z.union([z.string(), z.number()]).transform(String),
  // organization_id/organization.id son el identificador de ZyraVoice, no
  // nuestro projectId interno — el controller resuelve el Project mapeado
  // (Project.zyraOrganizationId) antes de matchear el cliente, para no mezclar
  // clientes de otra empresa que use la misma integración de ZyraVoice.
  organization_id: z.union([z.string(), z.number()]).transform(String),
  organization: z.object({ id: z.union([z.string(), z.number()]), name: z.string().optional() }).optional(),
  campaign: z.object({ id: z.union([z.string(), z.number()]).optional(), name: z.string().optional() }).optional(),
  template_key: z.string().optional(),
  subject: z.string().min(1),
  email: z.string().email(),
  sent_at: z.string().min(1),
  prospect: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    company: z.string().optional(),
  }).optional(),
});

/**
 * @openapi
 * /integrations/emails:
 *   post:
 *     summary: Webhook de ZyraVoice cuando se envía un email de una campaña de marketing
 *     tags: [Integrations]
 *     security: [{ zyraWebhookSignature: [] }]
 *     responses:
 *       200: { description: Interacción registrada, o "skipped" si organization_id no está mapeado a un Project o no hay cliente con ese email en el proyecto }
 *       401: { description: Firma inválida }
 */
router.post(
  '/',
  requireWebhookSignature({ headerName: 'x-zyravoice-signature', secretEnvVar: 'ZYRA_CRM_WEBHOOK_SECRET', prefix: 'sha256=' }),
  validate(emailWebhookSchema),
  handleEmailSent
);

module.exports = router;
