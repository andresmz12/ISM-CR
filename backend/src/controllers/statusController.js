const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

async function listStatuses(req, res) {
  const statuses = await prisma.status.findMany({ orderBy: { order: 'asc' } });
  res.json(statuses);
}

async function createStatus(req, res) {
  const { name, order, isDefault } = req.body;
  if (isDefault) {
    await prisma.status.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  const status = await prisma.status.create({ data: { name, order: order ?? 0, isDefault: !!isDefault } });
  res.status(201).json(status);
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { name, order, isDefault } = req.body;
  if (isDefault) {
    await prisma.status.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  const data = {};
  if (name !== undefined) data.name = name;
  if (order !== undefined) data.order = order;
  if (isDefault !== undefined) data.isDefault = isDefault;
  const status = await prisma.status.update({ where: { id }, data });
  res.json(status);
}

async function deleteStatus(req, res) {
  const { id } = req.params;
  await prisma.status.delete({ where: { id } });
  res.status(204).send();
}

module.exports = wrapAll({ listStatuses, createStatus, updateStatus, deleteStatus });
