const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireApiKey } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { asyncHandler } = require('../utils/asyncHandler');

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
router.get('/clients/:id', asyncHandler(async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: { status: true },
  });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
}));

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
router.post('/clients/:id/status', validate(statusUpdateSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { statusId, note } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const statusChanged = statusId !== client.statusId;
  const systemUser = note ? await prisma.user.findFirst({ where: { role: 'ADMIN' } }) : null;

  const [updated] = await prisma.$transaction([
    prisma.client.update({ where: { id }, data: { statusId } }),
    ...(statusChanged
      ? [prisma.auditLog.create({
          data: { clientId: id, field: 'statusId', oldValue: client.statusId, newValue: statusId },
        })]
      : []),
    ...(note && systemUser
      ? [prisma.interaction.create({
          data: {
            clientId: id,
            userId: systemUser.id,
            notes: `[Integración externa] ${note}`,
            resultStatusId: statusId,
          },
        })]
      : []),
  ]);
  res.json(updated);
}));

const pickupConfirmSchema = z.object({
  trackingCode: z.string().min(1).optional(),
  pickupRequestId: z.string().min(1).optional(),
  call: z.string().min(1),
  confirmedAddress: z.string().min(1).optional(),
}).refine((data) => data.trackingCode || data.pickupRequestId, {
  message: 'Se requiere trackingCode o pickupRequestId',
  path: ['trackingCode'],
});

/**
 * @openapi
 * /integrations/pickups/confirm:
 *   post:
 *     summary: ZyraVoice pushes the outcome of a pickup-confirmation call
 *     tags: [Integrations]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       201: { description: Confirmation interaction logged }
 *       404: { description: No client found for the given trackingCode/pickupRequestId }
 */
router.post('/pickups/confirm', validate(pickupConfirmSchema), asyncHandler(async (req, res) => {
  const { trackingCode, pickupRequestId, call, confirmedAddress } = req.body;
  const code = trackingCode ?? pickupRequestId;

  const client = await prisma.client.findUnique({ where: { trackingCode: code } });
  if (!client) {
    return res.status(404).json({ error: `No se encontró un cliente con trackingCode/pickupRequestId "${code}"` });
  }

  const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!systemUser) {
    return res.status(500).json({ error: 'No hay un usuario ADMIN configurado para atribuir la interacción' });
  }

  const notes = confirmedAddress
    ? `[ZyraVoice - confirmación de pickup] ${call}\nDirección confirmada: ${confirmedAddress}`
    : `[ZyraVoice - confirmación de pickup] ${call}`;

  const [interaction] = await prisma.$transaction([
    prisma.interaction.create({
      data: { clientId: client.id, userId: systemUser.id, type: 'OTHER', notes },
    }),
    ...(confirmedAddress && confirmedAddress !== client.address
      ? [prisma.client.update({ where: { id: client.id }, data: { address: confirmedAddress } })]
      : []),
  ]);

  res.status(201).json(interaction);
}));

module.exports = router;
