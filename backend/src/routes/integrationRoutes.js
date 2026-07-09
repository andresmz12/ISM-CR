const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireApiKey } = require('../middleware/auth');
const { validate } = require('../utils/validate');

const router = express.Router();
router.use(requireApiKey);

/**
 * @openapi
 * /integrations/clients/{id}:
 *   get:
 *     summary: Get a client by ID (external API key auth)
 *     tags: [Integrations]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       200: { description: Client detail }
 */
router.get('/clients/:id', async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: { status: true },
  });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

const statusUpdateSchema = z.object({ statusId: z.string().uuid(), note: z.string().optional() });

/**
 * @openapi
 * /integrations/clients/{id}/status:
 *   post:
 *     summary: External systems (e.g. shipping app) push a status update for a client
 *     tags: [Integrations]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.post('/clients/:id/status', validate(statusUpdateSchema), async (req, res) => {
  const { id } = req.params;
  const { statusId, note } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const updated = await prisma.client.update({ where: { id }, data: { statusId } });
  if (note) {
    await prisma.interaction.create({
      data: {
        clientId: id,
        userId: (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id,
        notes: `[Integración externa] ${note}`,
        resultStatusId: statusId,
      },
    });
  }
  res.json(updated);
});

module.exports = router;
