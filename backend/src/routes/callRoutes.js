const express = require('express');
const { z } = require('zod');
const { requireWebhookSignature } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { handleCallEnded } = require('../controllers/callController');

const router = express.Router();

const callWebhookSchema = z.object({
  event: z.literal('call_ended'),
  timestamp: z.string(),
  organization: z.object({ id: z.union([z.string(), z.number()]), name: z.string().optional() }).optional(),
  agent: z.object({ name: z.string().optional(), company: z.string().optional() }).optional(),
  prospect: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    phone: z.union([z.string().min(1), z.number()]).transform(String),
    company: z.string().optional(),
  }),
  call: z.object({
    id: z.union([z.string(), z.number()]),
    outcome: z.string().optional(),
    sentiment: z.string().optional(),
    appointment_scheduled: z.boolean().optional(),
    appointment_date: z.string().optional(),
    summary: z.string().optional(),
    client_said: z.array(z.string()).optional(),
    agent_said: z.array(z.string()).optional(),
    recording_url: z.string().optional(),
  }),
});

/**
 * @openapi
 * /integrations/calls:
 *   post:
 *     summary: Webhook de ZyraVoice cuando termina una llamada saliente automatizada
 *     tags: [Integrations]
 *     security: [{ zyraWebhookSignature: [] }]
 *     responses:
 *       200: { description: Interacción registrada, o "skipped" si no hay cliente con ese teléfono }
 *       401: { description: Firma inválida }
 */
// TEMPORAL — diagnóstico del 400 en producción (quitar en cuanto se identifique
// el shape real que manda ZyraVoice y se ajuste callWebhookSchema). Loguea el
// body crudo tal cual llega, ANTES de que Zod lo rechace: `validate()` solo
// loguea los errores de Zod, no el payload que los provocó. Va DESPUÉS de
// requireWebhookSignature para no llenar los logs con requests sin firmar de
// terceros. Incluye datos del prospecto (teléfono, nombre) — por eso debe
// salir apenas se resuelva esto.
function debugLogRawBody(req, res, next) {
  console.error(`[calls][DEBUG TEMPORAL] body crudo recibido: ${JSON.stringify(req.body)}`);
  next();
}

router.post(
  '/',
  requireWebhookSignature({ headerName: 'x-zyravoice-signature', secretEnvVar: 'ZYRA_CRM_WEBHOOK_SECRET', prefix: 'sha256=' }),
  debugLogRawBody,
  validate(callWebhookSchema),
  handleCallEnded
);

module.exports = router;
