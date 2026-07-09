const express = require('express');
const { z } = require('zod');
const { createTask, updateTask, deleteTask } = require('../controllers/projectTaskController');
const { validate } = require('../utils/validate');

const router = express.Router({ mergeParams: true });

const STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const createSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  sectionId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
});

/**
 * @openapi
 * /projects/{projectId}/tasks:
 *   post:
 *     summary: Create a task in a project's board
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Task created }
 */
router.post('/', validate(createSchema), createTask);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}:
 *   patch:
 *     summary: Update a task (including moving it to another section)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Task updated }
 *   delete:
 *     summary: Delete a task
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Task deleted }
 */
router.patch('/:taskId', validate(updateSchema), updateTask);
router.delete('/:taskId', deleteTask);

module.exports = router;
