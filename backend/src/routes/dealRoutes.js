const express = require('express');
const { z } = require('zod');
const {
  listDeals, getDeal, createDeal, updateDeal, deleteDeal,
} = require('../controllers/dealController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();

router.use(requireAuth);

const STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

const createSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  amount: z.number().nonnegative().optional(),
  stage: z.enum(STAGES).optional(),
  ownerId: z.string().uuid().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

/**
 * @openapi
 * /deals:
 *   get:
 *     summary: List deals (filtered by stage/owner/client/company)
 *     tags: [Deals]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of deals }
 *   post:
 *     summary: Create a deal
 *     tags: [Deals]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Deal created }
 */
router.get('/', listDeals);
router.post('/', validate(createSchema), createDeal);

/**
 * @openapi
 * /deals/{id}:
 *   get:
 *     summary: Get a single deal
 *     tags: [Deals]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deal detail }
 *   patch:
 *     summary: Update a deal (including moving its stage)
 *     tags: [Deals]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deal updated }
 *   delete:
 *     summary: Delete a deal
 *     tags: [Deals]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deal deleted }
 */
router.get('/:id', getDeal);
router.patch('/:id', validate(updateSchema), updateDeal);
router.delete('/:id', deleteDeal);

module.exports = router;
