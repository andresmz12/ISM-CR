const express = require('express');
const { z } = require('zod');
const {
  listClients, getClient, createClient, updateClient, deleteClient, reassignClient, dailyTasks, overdueTasks, rangeTasks, importClients,
  uncontactedLeads, staleClients, clientDuplicates, mergeClients,
} = require('../controllers/clientController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const interactionRoutes = require('./interactionRoutes');
const attachmentRoutes = require('./attachmentRoutes');

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
  companyId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  autoAssign: z.boolean().optional(),
  listIds: z.array(z.string().uuid()).optional(),
});

const updateSchema = createSchema.omit({ autoAssign: true }).partial();

const mergeSchema = z.object({ sourceId: z.string().uuid() });

const reassignSchema = z.object({ agentId: z.string().uuid() });

const importSchema = z.object({
  duplicateAction: z.enum(['skip', 'create']).optional(),
  autoAssign: z.boolean().optional(),
  projectId: z.string().uuid().optional(),
  listId: z.string().uuid().optional(),
  rows: z.array(z.object({
    fullName: z.string(),
    phone: z.union([z.string(), z.number()]).transform(String),
    phoneAlt: z.union([z.string(), z.number()]).transform(String).optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    statusName: z.string().optional(),
    assignedAgentId: z.string().uuid().optional(),
  })).min(1).max(5000),
});

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
/**
 * @openapi
 * /clients/import:
 *   post:
 *     summary: Bulk-import clients (parsed from Excel/CSV on the frontend)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Import summary (created, duplicates, errors) }
 */
router.post('/import', validate(importSchema), importClients);

router.get('/tasks/today', dailyTasks);

/**
 * @openapi
 * /clients/tasks/overdue:
 *   get:
 *     summary: Clients with a follow-up date that has passed and was never logged
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Overdue follow-ups }
 */
router.get('/tasks/overdue', overdueTasks);

/**
 * @openapi
 * /clients/tasks/range:
 *   get:
 *     summary: Clients with a follow-up date within a given range (used by the calendar view)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Follow-ups within the range }
 */
router.get('/tasks/range', rangeTasks);

/**
 * @openapi
 * /clients/alerts/uncontacted:
 *   get:
 *     summary: Leads created more than N hours ago that were never contacted (first-contact SLA)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema: { type: integer, default: 24 }
 *     responses:
 *       200: { description: Uncontacted leads past the SLA }
 */
router.get('/alerts/uncontacted', uncontactedLeads);

/**
 * @openapi
 * /clients/alerts/stale:
 *   get:
 *     summary: Clients whose last interaction was more than N days ago (cold clients)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 7 }
 *     responses:
 *       200: { description: Cold clients }
 */
router.get('/alerts/stale', staleClients);

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
 *   delete:
 *     summary: Delete a client (Agent can only delete their own assigned clients)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Client deleted }
 */
router.get('/:id', getClient);
router.patch('/:id', validate(updateSchema), updateClient);
router.delete('/:id', deleteClient);

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

/**
 * @openapi
 * /clients/{id}/duplicates:
 *   get:
 *     summary: Potential duplicates of this client (matched by normalized phone)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Possible duplicate clients }
 */
router.get('/:id/duplicates', clientDuplicates);

/**
 * @openapi
 * /clients/{id}/merge:
 *   post:
 *     summary: Merge another client (sourceId) into this one — moves history, fills missing fields, deletes the source (Admin/Supervisor only)
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Merged client }
 */
router.post('/:id/merge', requireRole('ADMIN', 'SUPERVISOR'), validate(mergeSchema), mergeClients);

router.use('/:clientId/interactions', interactionRoutes);
router.use('/:clientId/attachments', attachmentRoutes);

module.exports = router;
