const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireApiKey } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { asyncHandler } = require('../utils/asyncHandler');
const { pickAutoAssignAgent } = require('../utils/autoAssign');

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
  // Las notas de integraciones se atribuyen al usuario "Sistema" (creado por el
  // seed) para no inflar la actividad de un admin real; fallback al primer admin
  // por si el seed aún no corrió con esta versión.
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  const systemUser = note
    ? (await prisma.user.findUnique({ where: { email: systemEmail } }))
      ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))
    : null;

  const [updated] = await prisma.$transaction([
    prisma.client.update({
      where: { id },
      data: { statusId, ...(note && systemUser ? { lastContactedAt: new Date() } : {}) },
    }),
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

const leadSchema = z.object({
  fullName: z.string().min(1),
  phone: z.union([z.string().min(1), z.number()]).transform(String),
  email: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

function normalizePhoneOrNull(p) {
  const n = String(p ?? '').replace(/\D/g, '');
  return n || null;
}

/**
 * @openapi
 * /integrations/leads:
 *   post:
 *     summary: Capture an inbound lead (website form, ads) — dedupes by phone and auto-assigns round-robin
 *     tags: [Integrations]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       201: { description: Lead created }
 *       200: { description: Lead already existed (matched by phone) }
 */
router.post('/leads', validate(leadSchema), asyncHandler(async (req, res) => {
  const { fullName, phone, email, source, notes } = req.body;
  const norm = normalizePhoneOrNull(phone);

  // Dedupe por teléfono normalizado: si el lead ya existe, se registra la nota
  // como interacción en vez de crear un duplicado.
  const existing = norm
    ? await prisma.client.findFirst({
        where: { OR: [{ phoneNormalized: norm }, { phoneAltNormalized: norm }] },
      })
    : null;

  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  const systemUser = (await prisma.user.findUnique({ where: { email: systemEmail } }))
    ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));

  if (existing) {
    if (systemUser) {
      await prisma.$transaction([
        prisma.interaction.create({
          data: {
            clientId: existing.id,
            userId: systemUser.id,
            type: 'OTHER',
            notes: `[Lead entrante repetido] ${notes || `Volvió a llegar desde ${source || 'origen desconocido'}`}`,
          },
        }),
        prisma.client.update({ where: { id: existing.id }, data: { lastContactedAt: new Date() } }),
      ]);
    }
    return res.json({ existing: true, clientId: existing.id });
  }

  const defaultStatus = await prisma.status.findFirst({ where: { isDefault: true } });
  if (!defaultStatus) return res.status(500).json({ error: 'No hay estatus por defecto configurado' });

  const assignedAgentId = (await pickAutoAssignAgent()) ?? undefined;

  const client = await prisma.client.create({
    data: {
      fullName,
      phone,
      phoneNormalized: norm,
      email: email || undefined,
      source: source || 'web',
      statusId: defaultStatus.id,
      assignedAgentId,
    },
  });

  if (notes && systemUser) {
    await prisma.interaction.create({
      data: {
        clientId: client.id,
        userId: systemUser.id,
        type: 'OTHER',
        notes: `[Lead entrante] ${notes}`,
      },
    });
  }

  res.status(201).json({ existing: false, clientId: client.id, assignedAgentId: assignedAgentId ?? null });
}));

module.exports = router;
