const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

async function listLists(req, res) {
  const lists = await prisma.clientList.findMany({
    where: { projectId: req.project.id },
    include: { _count: { select: { items: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(lists.map((l) => ({ id: l.id, name: l.name, createdAt: l.createdAt, clientCount: l._count.items })));
}

async function createList(req, res) {
  const { name } = req.body;
  const existing = await prisma.clientList.findUnique({
    where: { projectId_name: { projectId: req.project.id, name } },
  });
  if (existing) return res.status(409).json({ error: 'Ya existe una lista con ese nombre en esta empresa' });

  const list = await prisma.clientList.create({
    data: { projectId: req.project.id, name },
  });
  res.status(201).json({ id: list.id, name: list.name, createdAt: list.createdAt, clientCount: 0 });
}

async function renameList(req, res) {
  const { listId } = req.params;
  const { name } = req.body;

  const list = await prisma.clientList.findFirst({ where: { id: listId, projectId: req.project.id } });
  if (!list) return res.status(404).json({ error: 'List not found' });

  const clash = await prisma.clientList.findUnique({
    where: { projectId_name: { projectId: req.project.id, name } },
  });
  if (clash && clash.id !== listId) return res.status(409).json({ error: 'Ya existe una lista con ese nombre en esta empresa' });

  const updated = await prisma.clientList.update({ where: { id: listId }, data: { name } });
  res.json(updated);
}

async function deleteList(req, res) {
  const { listId } = req.params;
  const list = await prisma.clientList.findFirst({ where: { id: listId, projectId: req.project.id } });
  if (!list) return res.status(404).json({ error: 'List not found' });
  // No borra los clientes, solo la lista y sus membresías (ClientListItem tiene
  // onDelete: Cascade únicamente sobre esa tabla puente).
  await prisma.clientList.delete({ where: { id: listId } });
  res.status(204).send();
}

module.exports = wrapAll({ listLists, createList, renameList, deleteList });
