const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

async function listSavedFilters(req, res) {
  const filters = await prisma.savedFilter.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: 'asc' },
  });
  res.json(filters);
}

async function createSavedFilter(req, res) {
  const { name, filters } = req.body;
  const saved = await prisma.savedFilter.create({
    data: { userId: req.user.sub, name, filters },
  });
  res.status(201).json(saved);
}

async function deleteSavedFilter(req, res) {
  const { id } = req.params;
  const existing = await prisma.savedFilter.findFirst({ where: { id, userId: req.user.sub } });
  if (!existing) return res.status(404).json({ error: 'Saved filter not found' });
  await prisma.savedFilter.delete({ where: { id } });
  res.status(204).send();
}

module.exports = wrapAll({ listSavedFilters, createSavedFilter, deleteSavedFilter });
