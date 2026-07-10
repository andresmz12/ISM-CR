const crypto = require('crypto');
const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

const publicSelect = {
  id: true, name: true, active: true, createdAt: true, lastUsedAt: true, projectId: true,
  project: { select: { id: true, name: true } },
};

function hashKey(key) {
  return crypto.createHash('sha256').update(key + process.env.API_KEY_SALT).digest('hex');
}

async function listApiKeys(req, res) {
  const keys = await prisma.apiKey.findMany({ select: publicSelect, orderBy: { createdAt: 'desc' } });
  res.json(keys);
}

async function createApiKey(req, res) {
  const { name, projectId } = req.body;
  // El valor en claro solo existe en esta respuesta; en la BD queda el hash.
  const plainKey = `ismk_${crypto.randomBytes(24).toString('hex')}`;
  const apiKey = await prisma.apiKey.create({
    data: { name, keyHash: hashKey(plainKey), projectId: projectId || undefined },
    select: publicSelect,
  });
  res.status(201).json({ ...apiKey, key: plainKey });
}

async function updateApiKey(req, res) {
  const { id } = req.params;
  const { name, active, projectId } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (active !== undefined) data.active = active;
  if (projectId !== undefined) data.projectId = projectId || null;
  const apiKey = await prisma.apiKey.update({ where: { id }, data, select: publicSelect });
  res.json(apiKey);
}

async function deleteApiKey(req, res) {
  const { id } = req.params;
  await prisma.apiKey.delete({ where: { id } });
  res.status(204).send();
}

module.exports = wrapAll({ listApiKeys, createApiKey, updateApiKey, deleteApiKey });
