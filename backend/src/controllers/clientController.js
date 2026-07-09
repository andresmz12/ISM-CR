const prisma = require('../config/prisma');

function scopeFilter(user) {
  if (user.role === 'AGENT') {
    return { assignedAgentId: user.sub };
  }
  return {};
}

async function listClients(req, res) {
  const { search, statusId, assignedAgentId, page = '1', pageSize = '25' } = req.query;
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

  const take = Math.min(parseInt(pageSize, 10) || 25, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
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
      interactions: {
        include: { user: { select: { id: true, fullName: true } }, resultStatus: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
}

async function createClient(req, res) {
  const { fullName, phone, phoneAlt, email, address, statusId, assignedAgentId, nextFollowUpAt } = req.body;
  let finalStatusId = statusId;
  if (!finalStatusId) {
    const def = await prisma.status.findFirst({ where: { isDefault: true } });
    finalStatusId = def ? def.id : undefined;
  }
  const client = await prisma.client.create({
    data: {
      fullName,
      phone,
      phoneAlt,
      email,
      address,
      statusId: finalStatusId,
      assignedAgentId: assignedAgentId ?? (req.user.role === 'AGENT' ? req.user.sub : undefined),
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
    },
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(client);
}

async function updateClient(req, res) {
  const { id } = req.params;
  const existing = await prisma.client.findFirst({ where: { id, ...scopeFilter(req.user) } });
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const { fullName, phone, phoneAlt, email, address, statusId, nextFollowUpAt } = req.body;
  const data = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (phone !== undefined) data.phone = phone;
  if (phoneAlt !== undefined) data.phoneAlt = phoneAlt;
  if (email !== undefined) data.email = email;
  if (address !== undefined) data.address = address;
  if (statusId !== undefined) data.statusId = statusId;
  if (nextFollowUpAt !== undefined) data.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;

  const client = await prisma.client.update({
    where: { id },
    data,
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
  });
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

module.exports = { listClients, getClient, createClient, updateClient, reassignClient, dailyTasks };
