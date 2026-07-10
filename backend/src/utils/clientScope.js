const prisma = require('../config/prisma');

// IDs de los proyectos donde el usuario es miembro (ProjectMember).
async function projectIdsForUser(userId) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}

// Alcance de un AGENT sobre Client: solo sus clientes asignados, y si el cliente
// tiene projectId, solo si el agente es miembro de ese proyecto (ProjectMember).
// Los clientes sin projectId (todo el dataset previo a esta columna) siguen
// visibles sin restricción de proyecto — así el dataset existente no desaparece
// el día que esto se despliega.
async function clientScopeFilter(user) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return {};

  const projectIds = await projectIdsForUser(user.sub);

  return {
    assignedAgentId: user.sub,
    // Anidado bajo AND (no como OR de primer nivel): varios callers arman su
    // propio where.OR para búsqueda de texto libre, y un OR de primer nivel
    // aquí se lo pisaría silenciosamente al asignarlo después.
    AND: [{ OR: [{ projectId: null }, { projectId: { in: projectIds } }] }],
  };
}

module.exports = { clientScopeFilter, projectIdsForUser };
