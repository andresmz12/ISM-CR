const express = require('express');
const { z } = require('zod');
const {
  listWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, addMember, removeMember,
} = require('../controllers/workspaceController');
const { requireAuth, requireRole, requireWorkspaceAccess } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  memberIds: z.array(z.string().uuid()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
});

const memberSchema = z.object({ userId: z.string().uuid() });

/**
 * @openapi
 * /workspaces:
 *   get:
 *     summary: List workspaces (empresas) the current user belongs to (Admin/Supervisor see all)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of workspaces }
 *   post:
 *     summary: Create a workspace (Admin/Supervisor only)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Workspace created }
 */
router.get('/', listWorkspaces);
router.post('/', requireRole('ADMIN', 'SUPERVISOR'), validate(createSchema), createWorkspace);

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   get:
 *     summary: Get a workspace with its members
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Workspace detail }
 *   patch:
 *     summary: Update a workspace (Admin/Supervisor only)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Workspace updated }
 *   delete:
 *     summary: Delete a workspace (Admin/Supervisor only)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Workspace deleted }
 */
router.get('/:workspaceId', requireWorkspaceAccess, getWorkspace);
router.patch('/:workspaceId', requireRole('ADMIN', 'SUPERVISOR'), validate(updateSchema), updateWorkspace);
router.delete('/:workspaceId', requireRole('ADMIN', 'SUPERVISOR'), deleteWorkspace);

/**
 * @openapi
 * /workspaces/{workspaceId}/members:
 *   post:
 *     summary: Add a member to a workspace (Admin/Supervisor only)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Member added }
 */
router.post('/:workspaceId/members', requireRole('ADMIN', 'SUPERVISOR'), validate(memberSchema), addMember);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a workspace (Admin/Supervisor only)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Member removed }
 */
router.delete('/:workspaceId/members/:userId', requireRole('ADMIN', 'SUPERVISOR'), removeMember);

module.exports = router;
