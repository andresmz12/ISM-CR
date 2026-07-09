const prisma = require('../config/prisma');

async function summary(req, res) {
  const scope = req.user.role === 'AGENT' ? { assignedAgentId: req.user.sub } : {};

  const [byStatus, byAgent, recentInteractions, totalClients] = await Promise.all([
    prisma.client.groupBy({ by: ['statusId'], where: scope, _count: true }),
    prisma.client.groupBy({ by: ['assignedAgentId'], where: scope, _count: true }),
    prisma.interaction.findMany({
      where: req.user.role === 'AGENT' ? { userId: req.user.sub } : {},
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        client: { select: { id: true, fullName: true } },
        user: { select: { id: true, fullName: true } },
        resultStatus: true,
      },
    }),
    prisma.client.count({ where: scope }),
  ]);

  const [statuses, agents] = await Promise.all([
    prisma.status.findMany(),
    prisma.user.findMany({ select: { id: true, fullName: true } }),
  ]);
  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s.name]));
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.fullName]));

  res.json({
    totalClients,
    byStatus: byStatus.map((s) => ({ statusId: s.statusId, statusName: statusMap[s.statusId], count: s._count })),
    byAgent: byAgent.map((a) => ({
      agentId: a.assignedAgentId,
      agentName: a.assignedAgentId ? agentMap[a.assignedAgentId] : 'Unassigned',
      count: a._count,
    })),
    recentInteractions,
  });
}

async function exportClientsCsv(req, res) {
  const scope = req.user.role === 'AGENT' ? { assignedAgentId: req.user.sub } : {};
  const clients = await prisma.client.findMany({
    where: scope,
    include: { status: true, assignedAgent: { select: { fullName: true } } },
    orderBy: { fullName: 'asc' },
  });

  const header = ['Full Name', 'Phone', 'Alt Phone', 'Email', 'Address', 'Status', 'Assigned Agent', 'Next Follow-up', 'Created At'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = clients.map((c) => [
    c.fullName, c.phone, c.phoneAlt, c.email, c.address,
    c.status?.name, c.assignedAgent?.fullName, c.nextFollowUpAt?.toISOString() ?? '', c.createdAt.toISOString(),
  ].map(escape).join(','));

  const csv = [header.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
  res.send(csv);
}

module.exports = { summary, exportClientsCsv };
