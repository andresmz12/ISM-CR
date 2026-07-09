const prisma = require('../config/prisma');

// Devuelve los agentes activos ordenados de menor a mayor carga (clientes
// asignados). El primero es el candidato para auto-asignación: reparte los
// leads de forma pareja y se auto-balancea si un agente entra o sale.
async function agentsByLoad() {
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT', active: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (agents.length === 0) return [];

  const counts = await prisma.client.groupBy({
    by: ['assignedAgentId'],
    where: { assignedAgentId: { in: agents.map((a) => a.id) } },
    _count: true,
  });
  const countMap = new Map(counts.map((c) => [c.assignedAgentId, c._count]));
  return agents
    .map((a) => ({ id: a.id, load: countMap.get(a.id) ?? 0 }))
    .sort((a, b) => a.load - b.load);
}

async function pickAutoAssignAgent() {
  const ranked = await agentsByLoad();
  return ranked.length > 0 ? ranked[0].id : null;
}

module.exports = { agentsByLoad, pickAutoAssignAgent };
