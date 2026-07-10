const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

function scopeFilter(user) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return {};
  return { members: { some: { userId: user.sub } } };
}

async function listWorkspaces(req, res) {
  const workspaces = await prisma.workspace.findMany({
    where: scopeFilter(req.user),
    include: {
      members: { include: { user: { select: { id: true, fullName: true } } } },
      _count: { select: { clients: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(workspaces);
}

async function getWorkspace(req, res) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.workspace.id },
    include: {
      members: { include: { user: { select: { id: true, fullName: true, active: true } } } },
      _count: { select: { clients: true } },
    },
  });
  res.json({ ...workspace, isPrivileged: req.isWorkspacePrivileged });
}

async function createWorkspace(req, res) {
  const { name, memberIds } = req.body;
  const workspace = await prisma.workspace.create({
    data: {
      name,
      members: {
        create: Array.from(new Set([...(memberIds ?? []), req.user.sub])).map((userId) => ({ userId })),
      },
    },
    include: { members: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  res.status(201).json(workspace);
}

async function updateWorkspace(req, res) {
  const { workspaceId } = req.params;
  const { name } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  const workspace = await prisma.workspace.update({ where: { id: workspaceId }, data });
  res.json(workspace);
}

async function deleteWorkspace(req, res) {
  const { workspaceId } = req.params;
  await prisma.workspace.delete({ where: { id: workspaceId } });
  res.status(204).send();
}

async function addMember(req, res) {
  const { workspaceId } = req.params;
  const { userId } = req.body;
  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(member);
}

async function removeMember(req, res) {
  const { workspaceId, userId } = req.params;
  await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId } } });
  res.status(204).send();
}

module.exports = wrapAll({
  listWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, addMember, removeMember,
});
