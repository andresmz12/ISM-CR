const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

// Normaliza teléfonos a solo dígitos para comparar duplicados
// ("8888-1234" y "88881234" deben coincidir).
function normalizePhone(p) {
  return String(p ?? '').replace(/\D/g, '');
}

function scopeFilter(user) {
  if (user.role === 'AGENT') {
    return { assignedAgentId: user.sub };
  }
  return {};
}

async function findDuplicates(phone, phoneAlt, excludeId) {
  const phones = [phone, phoneAlt].filter(Boolean);
  if (phones.length === 0) return [];
  return prisma.client.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      OR: phones.flatMap((p) => [{ phone: p }, { phoneAlt: p }]),
    },
    select: { id: true, fullName: true, phone: true, assignedAgent: { select: { fullName: true } } },
    take: 5,
  });
}

async function listClients(req, res) {
  const { search, statusId, assignedAgentId, tag, page = '1', pageSize = '25' } = req.query;
  const where = { ...scopeFilter(req.user) };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { phoneAlt: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (statusId) where.statusId = statusId;
  if (assignedAgentId && req.user.role !== 'AGENT') where.assignedAgentId = assignedAgentId;
  if (tag) where.tags = { has: tag };

  const take = Math.min(parseInt(pageSize, 10) || 25, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { status: true, assignedAgent: { select: { id: true, fullName: true } }, company: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.client.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pageSize: take });
}

async function getClient(req, res) {
  const { id } = req.params;
  const client = await prisma.client.findFirst({
    where: { id, ...scopeFilter(req.user) },
    include: {
      status: true,
      assignedAgent: { select: { id: true, fullName: true } },
      company: true,
      interactions: {
        include: { user: { select: { id: true, fullName: true } }, resultStatus: true },
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
}

async function createClient(req, res) {
  const { fullName, phone, phoneAlt, email, address, statusId, assignedAgentId, companyId, source, tags, nextFollowUpAt } = req.body;
  let finalStatusId = statusId;
  if (!finalStatusId) {
    const def = await prisma.status.findFirst({ where: { isDefault: true } });
    finalStatusId = def ? def.id : undefined;
  }

  const duplicates = await findDuplicates(phone, phoneAlt);
  // Un AGENT no puede asignar el cliente a otro agente al crearlo.
  const finalAssignedAgentId = req.user.role === 'AGENT' ? req.user.sub : (assignedAgentId ?? undefined);

  const client = await prisma.client.create({
    data: {
      fullName,
      phone,
      phoneAlt,
      email,
      address,
      statusId: finalStatusId,
      assignedAgentId: finalAssignedAgentId,
      companyId,
      source,
      tags: tags ?? [],
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
    },
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } }, company: { select: { id: true, name: true } } },
  });

  res.status(201).json({ ...client, duplicateWarning: duplicates.length > 0 ? duplicates : undefined });
}

async function updateClient(req, res) {
  const { id } = req.params;
  const existing = await prisma.client.findFirst({ where: { id, ...scopeFilter(req.user) } });
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const { fullName, phone, phoneAlt, email, address, statusId, companyId, source, tags, nextFollowUpAt } = req.body;
  const data = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (phone !== undefined) data.phone = phone;
  if (phoneAlt !== undefined) data.phoneAlt = phoneAlt;
  if (email !== undefined) data.email = email;
  if (address !== undefined) data.address = address;
  if (statusId !== undefined) data.statusId = statusId;
  if (companyId !== undefined) data.companyId = companyId;
  if (source !== undefined) data.source = source;
  if (tags !== undefined) data.tags = tags;
  if (nextFollowUpAt !== undefined) data.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;

  const auditEntries = [];
  if (statusId !== undefined && statusId !== existing.statusId) {
    auditEntries.push({ clientId: id, userId: req.user.sub, field: 'statusId', oldValue: existing.statusId, newValue: statusId });
  }

  const [client] = await prisma.$transaction([
    prisma.client.update({
      where: { id },
      data,
      include: { status: true, assignedAgent: { select: { id: true, fullName: true } }, company: { select: { id: true, name: true } } },
    }),
    ...auditEntries.map((entry) => prisma.auditLog.create({ data: entry })),
  ]);
  res.json(client);
}

async function reassignClient(req, res) {
  const { id } = req.params;
  const { agentId } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const [updated] = await prisma.$transaction([
    prisma.client.update({ where: { id }, data: { assignedAgentId: agentId } }),
    prisma.clientAssignment.create({
      data: {
        clientId: id,
        fromAgentId: client.assignedAgentId,
        toAgentId: agentId,
        reassignedById: req.user.sub,
      },
    }),
    prisma.auditLog.create({
      data: {
        clientId: id,
        userId: req.user.sub,
        field: 'assignedAgentId',
        oldValue: client.assignedAgentId,
        newValue: agentId,
      },
    }),
  ]);
  res.json(updated);
}

async function dailyTasks(req, res) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const where = {
    ...scopeFilter(req.user),
    nextFollowUpAt: { gte: start, lte: end },
  };

  const items = await prisma.client.findMany({
    where,
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { nextFollowUpAt: 'asc' },
  });
  res.json(items);
}

async function rangeTasks(req, res) {
  const { start, end } = req.query;
  const where = {
    ...scopeFilter(req.user),
    nextFollowUpAt: { gte: new Date(start), lte: new Date(end) },
  };

  const items = await prisma.client.findMany({
    where,
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { nextFollowUpAt: 'asc' },
  });
  res.json(items);
}

async function overdueTasks(req, res) {
  const now = new Date();
  const where = {
    ...scopeFilter(req.user),
    nextFollowUpAt: { lt: now },
  };

  const items = await prisma.client.findMany({
    where,
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { nextFollowUpAt: 'asc' },
  });
  res.json(items);
}

async function importClients(req, res) {
  const { rows, duplicateAction = 'skip' } = req.body;

  const [statuses, defaultStatus, existingClients] = await Promise.all([
    prisma.status.findMany(),
    prisma.status.findFirst({ where: { isDefault: true } }),
    prisma.client.findMany({ select: { phone: true, phoneAlt: true } }),
  ]);

  const statusByName = new Map(statuses.map((s) => [s.name.trim().toLowerCase(), s.id]));
  const knownPhones = new Set();
  for (const c of existingClients) {
    if (c.phone) knownPhones.add(normalizePhone(c.phone));
    if (c.phoneAlt) knownPhones.add(normalizePhone(c.phoneAlt));
  }

  const results = { created: 0, duplicates: 0, errors: [] };
  const toCreate = [];

  rows.forEach((row, index) => {
    const fullName = String(row.fullName ?? '').trim();
    const phone = String(row.phone ?? '').trim();
    if (!fullName || !phone) {
      results.errors.push({ row: index + 1, error: 'Nombre y teléfono son obligatorios' });
      return;
    }

    let statusId = defaultStatus?.id;
    if (row.statusName) {
      const matched = statusByName.get(String(row.statusName).trim().toLowerCase());
      if (matched) statusId = matched;
    }
    if (!statusId) {
      results.errors.push({ row: index + 1, error: 'No hay estatus por defecto configurado' });
      return;
    }

    const normPhone = normalizePhone(phone);
    const isDuplicate = knownPhones.has(normPhone);
    if (isDuplicate) {
      results.duplicates += 1;
      if (duplicateAction === 'skip') return;
    }
    knownPhones.add(normPhone);

    toCreate.push({
      fullName,
      phone,
      phoneAlt: row.phoneAlt ? String(row.phoneAlt).trim() : undefined,
      email: row.email ? String(row.email).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
      source: row.source ? String(row.source).trim() : undefined,
      tags: Array.isArray(row.tags) ? row.tags : [],
      statusId,
      assignedAgentId: req.user.role === 'AGENT' ? req.user.sub : (row.assignedAgentId || undefined),
    });
  });

  if (toCreate.length > 0) {
    const created = await prisma.client.createMany({ data: toCreate });
    results.created = created.count;
  }

  res.status(201).json(results);
}

module.exports = wrapAll({
  listClients, getClient, createClient, updateClient, reassignClient, dailyTasks, overdueTasks, rangeTasks, importClients,
});
