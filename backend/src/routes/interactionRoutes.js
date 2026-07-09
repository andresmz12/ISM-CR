const express = require('express');
const { z } = require('zod');
const { listInteractions, createInteraction } = require('../controllers/interactionController');
const { validate } = require('../utils/validate');

const router = express.Router({ mergeParams: true });

const createSchema = z.object({
  notes: z.string().min(1),
  resultStatusId: z.string().uuid().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
});

/**
 * @openapi
 * /clients/{clientId}/interactions:
 *   get:
 *     summary: List interaction history for a client
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of interactions }
 *   post:
 *     summary: Log a new interaction with a client
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Interaction created }
 */
router.get('/', listInteractions);
router.post('/', validate(createSchema), createInteraction);

module.exports = router;
