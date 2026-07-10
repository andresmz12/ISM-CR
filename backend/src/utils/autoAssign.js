const prisma = require('../config/prisma');

// Devuelve los agentes activos ordenados de menor a mayor carga (clientes
// asignados). El primero es el candidato para auto-asignación: reparte los
// leads de forma pareja y se auto-balancea si un agente entra o sale.
async function agentsByLoad(db = prisma) {
  const agents = await db.user.findMany({
    where: { role: 'AGENT', active: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (agents.length === 0) return [];

  const counts = await db.client.groupBy({
    by: ['assignedAgentId'],
    where: { assignedAgentId: { in: agents.map((a) => a.id) } },
    _count: true,
  });
  const countMap = new Map(counts.map((c) => [c.assignedAgentId, c._count]));
  return agents
    .map((a) => ({ id: a.id, load: countMap.get(a.id) ?? 0 }))
    .sort((a, b) => a.load - b.load);
}

// Clave arbitraria fija para el advisory lock de Postgres (cualquier bigint sirve,
// solo debe ser consistente entre llamadas).
const ROUND_ROBIN_LOCK_KEY = 727100;

// Debe llamarse con `db` = el cliente de una transacción (`prisma.$transaction(async (tx) => ...)`)
// que también sea la que crea/actualiza el cliente con el agente elegido. El advisory
// lock se toma y se libera junto con esa transacción (pg_advisory_xact_lock), así que
// serializa "contar carga -> elegir agente -> crear cliente" de punta a punta: dos
// webhooks concurrentes ya no pueden leer el mismo conteo y asignarse al mismo agente.
async function pickAutoAssignAgent(db = prisma) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(${ROUND_ROBIN_LOCK_KEY})`;
  const ranked = await agentsByLoad(db);
  return ranked.length > 0 ? ranked[0].id : null;
}

module.exports = { agentsByLoad, pickAutoAssignAgent };
