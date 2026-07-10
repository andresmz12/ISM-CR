const prisma = require('../config/prisma');

// IDs de los proyectos donde el usuario es miembro (ProjectMember).
async function projectIdsForUser(userId) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}

// IDs de los workspaces (empresas) donde el usuario es miembro (WorkspaceMember).
async function workspaceIdsForUser(userId) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  return memberships.map((m) => m.workspaceId);
}

// Alcance de un AGENT sobre Client: solo sus clientes asignados, y si el cliente
// tiene projectId/workspaceId, solo si el agente es miembro de ese proyecto/workspace.
// Los clientes sin projectId o sin workspaceId (todo el dataset previo a esas
// columnas) siguen visibles sin esa restricción — así el dataset existente no
// desaparece el día que esto se despliega.
async function clientScopeFilter(user) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return {};

  const [projectIds, workspaceIds] = await Promise.all([
    projectIdsForUser(user.sub),
    workspaceIdsForUser(user.sub),
  ]);

  return {
    assignedAgentId: user.sub,
    // Anidado bajo AND (no como OR de primer nivel): varios callers arman su
    // propio where.OR para búsqueda de texto libre, y un OR de primer nivel
    // aquí se lo pisaría silenciosamente al asignarlo después.
    AND: [
      { OR: [{ projectId: null }, { projectId: { in: projectIds } }] },
      { OR: [{ workspaceId: null }, { workspaceId: { in: workspaceIds } }] },
    ],
  };
}

module.exports = { clientScopeFilter, projectIdsForUser, workspaceIdsForUser };
