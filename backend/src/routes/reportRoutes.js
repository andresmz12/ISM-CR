const express = require('express');
const { overview } = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * @openapi
 * /reports/overview:
 *   get:
 *     summary: Sales analytics overview (pipeline value, win rate, agent performance, activity trend)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reports overview }
 */
router.get('/overview', overview);

module.exports = router;
