const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

function scopeFilter(user) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return {};
  return { members: { some: { userId: user.sub } } };
}

async function listProjects(req, res) {
  const projects = await prisma.project.findMany({
    where: scopeFilter(req.user),
    include: {
      members: { include: { user: { select: { id: true, fullName: true } } } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects);
}

async function getProject(req, res) {
  const project = await prisma.project.findUnique({
    where: { id: req.project.id },
    include: {
      members: { include: { user: { select: { id: true, fullName: true, active: true } } } },
      _count: { select: { clients: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          tasks: {
            orderBy: { order: 'asc' },
            include: { assignee: { select: { id: true, fullName: true } } },
          },
        },
      },
    },
  });
  res.json({ ...project, isPrivileged: req.isProjectPrivileged });
}

async function createProject(req, res) {
  const { name, description, repoUrl, memberIds } = req.body;
  const project = await prisma.project.create({
    data: {
      name,
      description,
      repoUrl,
      members: {
        create: Array.from(new Set([...(memberIds ?? []), req.user.sub])).map((userId) => ({ userId })),
      },
      sections: {
        create: [{ name: 'Pendientes', order: 0 }, { name: 'Completado', order: 1 }],
      },
    },
    include: { members: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  res.status(201).json(project);
}

async function updateProject(req, res) {
  const { projectId } = req.params;
  const { name, description, repoUrl, archived, zyraOrganizationId } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (repoUrl !== undefined) data.repoUrl = repoUrl;
  if (archived !== undefined) data.archived = archived;
  if (zyraOrganizationId !== undefined) data.zyraOrganizationId = zyraOrganizationId || null;
  const project = await prisma.project.update({ where: { id: projectId }, data });
  res.json(project);
}

async function deleteProject(req, res) {
  const { projectId } = req.params;
  await prisma.project.delete({ where: { id: projectId } });
  res.status(204).send();
}

async function addMember(req, res) {
  const { projectId } = req.params;
  const { userId } = req.body;
  const member = await prisma.projectMember.create({
    data: { projectId, userId },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(member);
}

async function removeMember(req, res) {
  const { projectId, userId } = req.params;
  await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  res.status(204).send();
}

module.exports = wrapAll({
  listProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember,
});
