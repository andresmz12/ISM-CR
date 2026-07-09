const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

function scopeFilter(user) {
  if (user.role === 'AGENT') return { assignedAgentId: user.sub };
  return {};
}

async function listInteractions(req, res) {
  const { clientId } = req.params;
  const client = await prisma.client.findFirst({ where: { id: clientId, ...scopeFilter(req.user) } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const interactions = await prisma.interaction.findMany({
    where: { clientId },
    include: { user: { select: { id: true, fullName: true } }, resultStatus: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(interactions);
}

async function createInteraction(req, res) {
  const { clientId } = req.params;
  const { type, notes, resultStatusId, nextFollowUpAt } = req.body;

  const client = await prisma.client.findFirst({ where: { id: clientId, ...scopeFilter(req.user) } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const statusChanged = resultStatusId && resultStatusId !== client.statusId;

  const [interaction] = await prisma.$transaction([
    prisma.interaction.create({
      data: { clientId, userId: req.user.sub, type, notes, resultStatusId },
      include: { user: { select: { id: true, fullName: true } }, resultStatus: true },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: {
        ...(resultStatusId ? { statusId: resultStatusId } : {}),
        ...(nextFollowUpAt !== undefined ? { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null } : {}),
      },
    }),
    ...(statusChanged
      ? [prisma.auditLog.create({
          data: { clientId, userId: req.user.sub, field: 'statusId', oldValue: client.statusId, newValue: resultStatusId },
        })]
      : []),
  ]);

  res.status(201).json(interaction);
}

module.exports = wrapAll({ listInteractions, createInteraction });
