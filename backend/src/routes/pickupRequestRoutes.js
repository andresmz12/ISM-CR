const express = require('express');
const { z } = require('zod');
const { requireWebhookSignature } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { handlePickupRequest } = require('../controllers/pickupRequestController');

const router = express.Router();

const pickupRequestSchema = z.object({
  eventType: z.enum(['CREATED', 'STATUS_CHANGED']),
  pickupRequestId: z.string().min(1),
  trackingCode: z.string().min(1),
  status: z.string().min(1),
});

/**
 * @openapi
 * /integrations/pickup-requests:
 *   post:
 *     summary: Webhook de RECOGIDA-PAQ para creación/cambio de estatus de una recogida
 *     tags: [Integrations]
 *     security: [{ webhookSignature: [] }]
 *     responses:
 *       200: { description: Cliente creado/actualizado }
 *       400: { description: Estatus desconocido o datos incompletos }
 *       401: { description: Firma inválida }
 *       502: { description: No se pudo obtener el detalle desde RECOGIDA-PAQ }
 */
router.post('/', requireWebhookSignature, validate(pickupRequestSchema), handlePickupRequest);

module.exports = router;
