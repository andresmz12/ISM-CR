const express = require('express');
const { z } = require('zod');
const { listApiKeys, createApiKey, updateApiKey, deleteApiKey } = require('../controllers/apiKeyController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

const createSchema = z.object({ name: z.string().min(1).max(80) });
const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  active: z.boolean().optional(),
});

/**
 * @openapi
 * /api-keys:
 *   get:
 *     summary: List API keys for external integrations (Admin only; hashes never returned)
 *     tags: [ApiKeys]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: API keys }
 *   post:
 *     summary: Create an API key — the plaintext key is returned only once in this response
 *     tags: [ApiKeys]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: API key created (includes plaintext key) }
 */
router.get('/', listApiKeys);
router.post('/', validate(createSchema), createApiKey);

/**
 * @openapi
 * /api-keys/{id}:
 *   patch:
 *     summary: Rename or enable/disable an API key
 *     tags: [ApiKeys]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     summary: Delete an API key permanently
 *     tags: [ApiKeys]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted }
 */
router.patch('/:id', validate(updateSchema), updateApiKey);
router.delete('/:id', deleteApiKey);

module.exports = router;
