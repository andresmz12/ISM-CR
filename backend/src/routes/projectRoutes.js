const express = require('express');
const { z } = require('zod');
const {
  listProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember,
} = require('../controllers/projectController');
const { requireAuth, requireRole, requireProjectAccess } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const projectSectionRoutes = require('./projectSectionRoutes');
const projectTaskRoutes = require('./projectTaskRoutes');

const router = express.Router();

router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  repoUrl: z.string().optional(),
  archived: z.boolean().optional(),
  // organization_id que este proyecto recibe en los webhooks de ZyraVoice
  // (/integrations/emails, y a futuro /calls). '' se guarda como null (desmapear).
  zyraOrganizationId: z.string().optional(),
});

const memberSchema = z.object({ userId: z.string().uuid() });

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: List projects the current user belongs to (Admin/Supervisor see all)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of projects }
 *   post:
 *     summary: Create a project (Admin/Supervisor only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Project created }
 */
router.get('/', listProjects);
router.post('/', requireRole('ADMIN', 'SUPERVISOR'), validate(createSchema), createProject);

/**
 * @openapi
 * /projects/{projectId}:
 *   get:
 *     summary: Get a project with its members, sections and tasks
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Project detail }
 *   patch:
 *     summary: Update a project (Admin/Supervisor only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Project updated }
 *   delete:
 *     summary: Delete a project (Admin/Supervisor only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Project deleted }
 */
router.get('/:projectId', requireProjectAccess, getProject);
router.patch('/:projectId', requireRole('ADMIN', 'SUPERVISOR'), validate(updateSchema), updateProject);
router.delete('/:projectId', requireRole('ADMIN', 'SUPERVISOR'), deleteProject);

/**
 * @openapi
 * /projects/{projectId}/members:
 *   post:
 *     summary: Add a member to a project (Admin/Supervisor only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Member added }
 */
router.post('/:projectId/members', requireRole('ADMIN', 'SUPERVISOR'), validate(memberSchema), addMember);

/**
 * @openapi
 * /projects/{projectId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a project (Admin/Supervisor only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Member removed }
 */
router.delete('/:projectId/members/:userId', requireRole('ADMIN', 'SUPERVISOR'), removeMember);

router.use('/:projectId/sections', requireProjectAccess, projectSectionRoutes);
router.use('/:projectId/tasks', requireProjectAccess, projectTaskRoutes);

module.exports = router;
