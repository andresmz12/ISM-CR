const express = require('express');
const { z } = require('zod');
const { listUsers, createUser, updateUser } = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

const createSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']),
});

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of users }
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: User created }
 */
router.get('/', listUsers);
router.post('/', validate(createSchema), createUser);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update a user (Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User updated }
 */
router.patch('/:id', validate(updateSchema), updateUser);

module.exports = router;
