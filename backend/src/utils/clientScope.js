const prisma = require('../config/prisma');

// IDs de los proyectos donde el usuario es miembro (ProjectMember).
async function projectIdsForUser(userId) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}

// Alcance de un AGENT sobre Client: todos los clientes de las empresas
// (proyectos) donde es miembro — compartido con el resto del equipo, no solo
// los que tiene asignados. Los clientes sin projectId (todo el dataset previo
// a esta columna) siguen visibles sin restricción de proyecto — así el
// dataset existente no desaparece el día que esto se despliega.
async function clientScopeFilter(user) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return {};

  const projectIds = await projectIdsForUser(user.sub);

  return {
    // Anidado bajo AND (no como OR de primer nivel): varios callers arman su
    // propio where.OR para búsqueda de texto libre, y un OR de primer nivel
    // aquí se lo pisaría silenciosamente al asignarlo después.
    AND: [{ OR: [{ projectId: null }, { projectId: { in: projectIds } }] }],
  };
}

// Igual que clientScopeFilter, pero además restringido a los clientes
// asignados al propio usuario — para las vistas "personales" de agenda
// (seguimientos de hoy/vencidos, alertas de SLA), a diferencia de la lista
// general de Clientes de una empresa, que es compartida por todo el equipo.
async function myFollowUpScopeFilter(user) {
  const scope = await clientScopeFilter(user);
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return scope;
  return { ...scope, assignedAgentId: user.sub };
}

module.exports = { clientScopeFilter, myFollowUpScopeFilter, projectIdsForUser };
