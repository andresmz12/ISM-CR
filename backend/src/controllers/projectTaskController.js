const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

const include = { assignee: { select: { id: true, fullName: true } } };

async function assertMember(projectId, userId) {
  if (!userId) return true;
  const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  return !!membership;
}

async function createTask(req, res) {
  const { projectId } = req.params;
  const { sectionId, title, status, priority, assigneeId, dueDate, notes } = req.body;

  const section = await prisma.projectSection.findFirst({ where: { id: sectionId, projectId } });
  if (!section) return res.status(400).json({ error: 'Section does not belong to this project' });
  if (assigneeId && !(await assertMember(projectId, assigneeId))) {
    return res.status(400).json({ error: 'El responsable debe ser miembro del proyecto' });
  }

  const last = await prisma.projectTask.findFirst({ where: { sectionId }, orderBy: { order: 'desc' } });
  const task = await prisma.projectTask.create({
    data: {
      projectId,
      sectionId,
      title,
      status: status ?? 'PENDING',
      priority: priority ?? 'MEDIUM',
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      order: last ? last.order + 1 : 0,
    },
    include,
  });
  res.status(201).json(task);
}

async function updateTask(req, res) {
  const { projectId, taskId } = req.params;
  const existing = await prisma.projectTask.findFirst({ where: { id: taskId, projectId } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { sectionId, title, status, priority, assigneeId, dueDate, notes, order } = req.body;
  const data = {};
  if (title !== undefined) data.title = title;
  if (status !== undefined) data.status = status;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (notes !== undefined) data.notes = notes;
  if (order !== undefined) data.order = order;

  if (sectionId !== undefined) {
    const section = await prisma.projectSection.findFirst({ where: { id: sectionId, projectId } });
    if (!section) return res.status(400).json({ error: 'Section does not belong to this project' });
    data.sectionId = sectionId;
  }
  if (assigneeId !== undefined) {
    if (assigneeId && !(await assertMember(projectId, assigneeId))) {
      return res.status(400).json({ error: 'El responsable debe ser miembro del proyecto' });
    }
    data.assigneeId = assigneeId || null;
  }

  const task = await prisma.projectTask.update({ where: { id: taskId }, data, include });
  res.json(task);
}

async function deleteTask(req, res) {
  const { projectId, taskId } = req.params;
  const existing = await prisma.projectTask.findFirst({ where: { id: taskId, projectId } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  await prisma.projectTask.delete({ where: { id: taskId } });
  res.status(204).send();
}

module.exports = wrapAll({ createTask, updateTask, deleteTask });
