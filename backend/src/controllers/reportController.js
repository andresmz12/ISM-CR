const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { clientScopeFilter } = require('../utils/clientScope');

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

async function overview(req, res) {
  const isAgent = req.user.role === 'AGENT';
  const dealScope = isAgent ? { ownerId: req.user.sub } : {};
  const clientScope = await clientScopeFilter(req.user);
  const interactionScope = isAgent ? { userId: req.user.sub } : {};

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [openDeals, wonDeals, lostDeals, byStatus, agents, agentClientCounts, agentDealCounts, recentInteractions] = await Promise.all([
    prisma.deal.findMany({ where: { ...dealScope, stage: { notIn: ['WON', 'LOST'] } }, select: { amount: true } }),
    prisma.deal.findMany({ where: { ...dealScope, stage: 'WON' }, select: { amount: true } }),
    prisma.deal.count({ where: { ...dealScope, stage: 'LOST' } }),
    prisma.client.groupBy({ by: ['statusId'], where: clientScope, _count: true }),
    prisma.user.findMany({ where: { active: true, ...(isAgent ? { id: req.user.sub } : {}) }, select: { id: true, fullName: true, role: true } }),
    prisma.client.groupBy({ by: ['assignedAgentId'], where: clientScope, _count: true }),
    prisma.deal.groupBy({ by: ['ownerId', 'stage'], where: dealScope, _count: true, _sum: { amount: true } }),
    prisma.interaction.findMany({
      where: { ...interactionScope, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const statuses = await prisma.status.findMany();
  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s.name]));

  const pipelineValue = openDeals.reduce((acc, d) => acc + (d.amount ?? 0), 0);
  const wonValue = wonDeals.reduce((acc, d) => acc + (d.amount ?? 0), 0);
  const wonCount = wonDeals.length;
  const winRate = wonCount + lostDeals > 0 ? wonCount / (wonCount + lostDeals) : null;
  const avgDealSize = wonCount > 0 ? wonValue / wonCount : null;

  const clientCountByAgent = Object.fromEntries(agentClientCounts.map((c) => [c.assignedAgentId, c._count]));
  const dealStatsByAgent = {};
  for (const row of agentDealCounts) {
    const key = row.ownerId ?? 'unassigned';
    if (!dealStatsByAgent[key]) dealStatsByAgent[key] = { won: 0, wonValue: 0, total: 0 };
    dealStatsByAgent[key].total += row._count;
    if (row.stage === 'WON') {
      dealStatsByAgent[key].won += row._count;
      dealStatsByAgent[key].wonValue += row._sum.amount ?? 0;
    }
  }

  const agentPerformance = agents.map((a) => ({
    agentId: a.id,
    agentName: a.fullName,
    clients: clientCountByAgent[a.id] ?? 0,
    dealsWon: dealStatsByAgent[a.id]?.won ?? 0,
    dealsWonValue: dealStatsByAgent[a.id]?.wonValue ?? 0,
    dealsTotal: dealStatsByAgent[a.id]?.total ?? 0,
  }));

  const trendMap = new Map();
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    trendMap.set(dayKey(d), 0);
  }
  for (const i of recentInteractions) {
    const key = dayKey(i.createdAt);
    if (trendMap.has(key)) trendMap.set(key, trendMap.get(key) + 1);
  }
  const interactionTrend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

  res.json({
    pipelineValue,
    winRate,
    avgDealSize,
    wonCount,
    lostCount: lostDeals,
    funnelByStatus: byStatus.map((s) => ({ statusId: s.statusId, statusName: statusMap[s.statusId], count: s._count })),
    agentPerformance,
    interactionTrend,
  });
}

module.exports = wrapAll({ overview });
