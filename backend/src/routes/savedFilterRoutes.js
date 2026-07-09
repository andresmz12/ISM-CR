const express = require('express');
const { z } = require('zod');
const { listSavedFilters, createSavedFilter, deleteSavedFilter } = require('../controllers/savedFilterController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(60),
  // Combinación de filtros de la lista de clientes (search, statusId, tag, etc.)
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * @openapi
 * /saved-filters:
 *   get:
 *     summary: List the current user's saved client-list filters
 *     tags: [SavedFilters]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Saved filters }
 *   post:
 *     summary: Save the current client-list filter combination under a name
 *     tags: [SavedFilters]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Saved filter created }
 */
router.get('/', listSavedFilters);
router.post('/', validate(createSchema), createSavedFilter);

/**
 * @openapi
 * /saved-filters/{id}:
 *   delete:
 *     summary: Delete one of the current user's saved filters
 *     tags: [SavedFilters]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted }
 */
router.delete('/:id', deleteSavedFilter);

module.exports = router;
