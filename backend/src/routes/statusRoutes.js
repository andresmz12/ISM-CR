const express = require('express');
const { z } = require('zod');
const { listStatuses, createStatus, updateStatus, deleteStatus } = require('../controllers/statusController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth);

const statusSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * @openapi
 * /statuses:
 *   get:
 *     summary: List client statuses
 *     tags: [Statuses]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of statuses }
 *   post:
 *     summary: Create a status (Admin only)
 *     tags: [Statuses]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Status created }
 */
router.get('/', listStatuses);
router.post('/', requireRole('ADMIN'), validate(statusSchema), createStatus);
router.patch('/:id', requireRole('ADMIN'), validate(statusSchema.partial()), updateStatus);
router.delete('/:id', requireRole('ADMIN'), deleteStatus);

module.exports = router;
