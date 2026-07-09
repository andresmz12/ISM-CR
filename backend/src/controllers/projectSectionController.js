const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

async function createSection(req, res) {
  const { projectId } = req.params;
  const { name, order } = req.body;
  let finalOrder = order;
  if (finalOrder === undefined) {
    const last = await prisma.projectSection.findFirst({ where: { projectId }, orderBy: { order: 'desc' } });
    finalOrder = last ? last.order + 1 : 0;
  }
  const section = await prisma.projectSection.create({ data: { projectId, name, order: finalOrder } });
  res.status(201).json(section);
}

async function updateSection(req, res) {
  const { projectId, sectionId } = req.params;
  const existing = await prisma.projectSection.findFirst({ where: { id: sectionId, projectId } });
  if (!existing) return res.status(404).json({ error: 'Section not found' });

  const { name, order } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (order !== undefined) data.order = order;
  const section = await prisma.projectSection.update({ where: { id: sectionId }, data });
  res.json(section);
}

async function deleteSection(req, res) {
  const { projectId, sectionId } = req.params;
  const existing = await prisma.projectSection.findFirst({ where: { id: sectionId, projectId } });
  if (!existing) return res.status(404).json({ error: 'Section not found' });
  await prisma.projectSection.delete({ where: { id: sectionId } });
  res.status(204).send();
}

module.exports = wrapAll({ createSection, updateSection, deleteSection });
