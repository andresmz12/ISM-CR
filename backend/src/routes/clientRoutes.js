const express = require('express');
const { z } = require('zod');
const {
  listClients, getClient, createClient, updateClient, reassignClient, dailyTasks,
} = require('../controllers/clientController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const interactionRoutes = require('./interactionRoutes');

const router = express.Router();

router.use(requireAuth);

const createSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  phoneAlt: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  statusId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

const updateSchema = createSchema.partial();

const reassignSchema = z.object({ agentId: z.string().uuid() });

/**
 * @openapi
 * /clients:
 *   get:
 *     summary: List clients (filtered, searchable, paginated)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of clients }
 *   post:
 *     summary: Create a client
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Client created }
 */
router.get('/', listClients);
router.post('/', validate(createSchema), createClient);

/**
 * @openapi
 * /clients/tasks/today:
 *   get:
 *     summary: Clients with a follow-up scheduled today
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Today's follow-ups }
 */
router.get('/tasks/today', dailyTasks);

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     summary: Get a single client with interaction history
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Client detail }
 *   patch:
 *     summary: Update a client
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Client updated }
 */
router.get('/:id', getClient);
router.patch('/:id', validate(updateSchema), updateClient);

/**
 * @openapi
 * /clients/{id}/reassign:
 *   post:
 *     summary: Reassign a client to another agent (Admin/Supervisor only)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Client reassigned }
 */
router.post('/:id/reassign', requireRole('ADMIN', 'SUPERVISOR'), validate(reassignSchema), reassignClient);

router.use('/:clientId/interactions', interactionRoutes);

module.exports = router;
