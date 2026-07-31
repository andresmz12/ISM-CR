const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireApiKey } = require('../middleware/auth');
const { validate } = require('../utils/validate');
const { asyncHandler } = require('../utils/asyncHandler');
const { pickAutoAssignAgent } = require('../utils/autoAssign');
const { normalizePhoneOrNull } = require('../utils/phone');

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
  // Una llave sin projectId es global (legacy); una con projectId solo ve clientes
  // de ese proyecto — así una integración de un proyecto no puede leer/enumerar
  // datos de otro solo por adivinar el UUID de un cliente ajeno.
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, ...(req.apiKey.projectId ? { projectId: req.apiKey.projectId } : {}) },
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
  const client = await prisma.client.findFirst({
    where: { id, ...(req.apiKey.projectId ? { projectId: req.apiKey.projectId } : {}) },
  });
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

function normalizeEmailOrNull(e) {
  const n = String(e ?? '').trim().toLowerCase();
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
  // Una llave con projectId propio manda a ese proyecto (en vez del default global);
  // también acota el dedupe por teléfono al mismo proyecto, para que una llave
  // scoped no pueda descubrir/tocar un cliente de otro proyecto solo por coincidir
  // el número de teléfono.
  const targetProjectId = req.apiKey.projectId || process.env.LEADS_DEFAULT_PROJECT_ID || undefined;

  // Dedupe por teléfono normalizado: si el lead ya existe, se registra la nota
  // como interacción en vez de crear un duplicado.
  const existing = norm
    ? await prisma.client.findFirst({
        where: {
          OR: [{ phoneNormalized: norm }, { phoneAltNormalized: norm }],
          ...(req.apiKey.projectId ? { projectId: req.apiKey.projectId } : {}),
        },
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

  // La elección de agente y la creación del cliente van en la misma transacción
  // que sostiene el advisory lock del round-robin: así dos leads concurrentes no
  // pueden leer la misma carga y terminar asignados al mismo agente (ver autoAssign.js).
  const client = await prisma.$transaction(async (tx) => {
    const assignedAgentId = (await pickAutoAssignAgent(tx)) ?? undefined;
    return tx.client.create({
      data: {
        fullName,
        phone,
        phoneNormalized: norm,
        email: email || undefined,
        emailNormalized: normalizeEmailOrNull(email),
        source: source || 'web',
        statusId: defaultStatus.id,
        assignedAgentId,
        projectId: targetProjectId,
      },
    });
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

  res.status(201).json({ existing: false, clientId: client.id, assignedAgentId: client.assignedAgentId ?? null });
}));

module.exports = router;
