const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

async function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing API key' });
  const keyHash = crypto.createHash('sha256').update(key + process.env.API_KEY_SALT).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey || !apiKey.active) return res.status(401).json({ error: 'Invalid API key' });
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  req.apiKey = apiKey;
  next();
}

// Cada proyecto tiene su propio equipo: ADMIN/SUPERVISOR ven y administran todos los
// proyectos, un AGENT solo accede a los proyectos donde tiene una fila en ProjectMember.
async function requireProjectAccess(req, res, next) {
  const { projectId } = req.params;
  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'SUPERVISOR';

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (!isPrivileged) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.sub } },
    });
    if (!membership) return res.status(404).json({ error: 'Project not found' });
  }

  req.project = project;
  req.isProjectPrivileged = isPrivileged;
  next();
}

module.exports = { requireAuth, requireRole, requireApiKey, requireProjectAccess };
