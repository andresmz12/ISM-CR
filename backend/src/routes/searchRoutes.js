const express = require('express');
const { globalSearch } = require('../controllers/searchController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Global search across clients, companies and deals (role-scoped)
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *     responses:
 *       200: { description: Grouped results }
 */
router.get('/', globalSearch);

module.exports = router;
