const express = require('express');
const { z } = require('zod');
const {
  listCompanies, getCompany, createCompany, updateCompany, deleteCompany,
} = require('../controllers/companyController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

/**
 * @openapi
 * /companies:
 *   get:
 *     summary: List companies (optionally searchable by name)
 *     tags: [Companies]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of companies }
 *   post:
 *     summary: Create a company (Admin/Supervisor only)
 *     tags: [Companies]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Company created }
 */
router.get('/', listCompanies);
router.post('/', requireRole('ADMIN', 'SUPERVISOR'), validate(createSchema), createCompany);

/**
 * @openapi
 * /companies/{id}:
 *   get:
 *     summary: Get a company with its linked clients and deals
 *     tags: [Companies]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Company detail }
 *   patch:
 *     summary: Update a company (Admin/Supervisor only)
 *     tags: [Companies]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Company updated }
 *   delete:
 *     summary: Delete a company (Admin/Supervisor only)
 *     tags: [Companies]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Company deleted }
 */
router.get('/:id', getCompany);
router.patch('/:id', requireRole('ADMIN', 'SUPERVISOR'), validate(updateSchema), updateCompany);
router.delete('/:id', requireRole('ADMIN', 'SUPERVISOR'), deleteCompany);

module.exports = router;
