const express = require('express');
const { summary, exportClientsCsv } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     summary: Aggregated stats (clients by status, by agent, recent activity)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard summary }
 */
router.get('/summary', summary);

/**
 * @openapi
 * /dashboard/export:
 *   get:
 *     summary: Export clients as CSV
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: CSV file }
 */
router.get('/export', exportClientsCsv);

module.exports = router;
