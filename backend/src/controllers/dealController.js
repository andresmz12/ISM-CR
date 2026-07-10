const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { projectIdsForUser } = require('../utils/clientScope');

const include = {
  client: { select: { id: true, fullName: true, phone: true } },
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, fullName: true } },
};

// Igual que clientScopeFilter: un AGENT solo ve sus propios deals, y si el deal
// está ligado a un cliente con projectId, solo si es miembro de ese proyecto.
// Deals sin cliente o con cliente sin projectId quedan visibles sin restricción.
async function scopeFilter(user) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return {};

  const projectIds = await projectIdsForUser(user.sub);
  return {
    ownerId: user.sub,
    AND: [{ OR: [{ clientId: null }, { client: { OR: [{ projectId: null }, { projectId: { in: projectIds } }] } }] }],
  };
}

const CLOSED_STAGES = ['WON', 'LOST'];

async function listDeals(req, res) {
  const { stage, ownerId, clientId, companyId } = req.query;
  const where = { ...(await scopeFilter(req.user)) };
  if (stage) where.stage = stage;
  if (ownerId && req.user.role !== 'AGENT') where.ownerId = ownerId;
  if (clientId) where.clientId = clientId;
  if (companyId) where.companyId = companyId;

  const deals = await prisma.deal.findMany({ where, include, orderBy: { updatedAt: 'desc' } });
  res.json(deals);
}

async function getDeal(req, res) {
  const { id } = req.params;
  const deal = await prisma.deal.findFirst({ where: { id, ...(await scopeFilter(req.user)) }, include });
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  res.json(deal);
}

async function createDeal(req, res) {
  const { title, clientId, companyId, amount, stage, ownerId, expectedCloseDate, notes } = req.body;
  // Un AGENT no puede asignarse un negocio a otro dueño: siempre queda como propio.
  const finalOwnerId = req.user.role === 'AGENT' ? req.user.sub : (ownerId ?? req.user.sub);
  const deal = await prisma.deal.create({
    data: {
      title,
      clientId,
      companyId,
      amount,
      stage: stage ?? 'PROSPECTING',
      ownerId: finalOwnerId,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      notes,
      closedAt: stage && CLOSED_STAGES.includes(stage) ? new Date() : undefined,
    },
    include,
  });
  res.status(201).json(deal);
}

async function updateDeal(req, res) {
  const { id } = req.params;
  const existing = await prisma.deal.findFirst({ where: { id, ...(await scopeFilter(req.user)) } });
  if (!existing) return res.status(404).json({ error: 'Deal not found' });

  const { title, clientId, companyId, amount, stage, ownerId, expectedCloseDate, notes } = req.body;
  const data = {};
  if (title !== undefined) data.title = title;
  if (clientId !== undefined) data.clientId = clientId;
  if (companyId !== undefined) data.companyId = companyId;
  if (amount !== undefined) data.amount = amount;
  // Un AGENT no puede reasignar sus negocios a otro dueño.
  if (ownerId !== undefined && req.user.role !== 'AGENT') data.ownerId = ownerId;
  if (notes !== undefined) data.notes = notes;
  if (expectedCloseDate !== undefined) data.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
  if (stage !== undefined) {
    data.stage = stage;
    if (CLOSED_STAGES.includes(stage) && !CLOSED_STAGES.includes(existing.stage)) data.closedAt = new Date();
    if (!CLOSED_STAGES.includes(stage)) data.closedAt = null;
  }

  const deal = await prisma.deal.update({ where: { id }, data, include });
  res.json(deal);
}

async function deleteDeal(req, res) {
  const { id } = req.params;
  const existing = await prisma.deal.findFirst({ where: { id, ...(await scopeFilter(req.user)) } });
  if (!existing) return res.status(404).json({ error: 'Deal not found' });
  await prisma.deal.delete({ where: { id } });
  res.status(204).send();
}

module.exports = wrapAll({ listDeals, getDeal, createDeal, updateDeal, deleteDeal });
