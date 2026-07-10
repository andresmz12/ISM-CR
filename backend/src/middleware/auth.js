const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice('Bearer '.length);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  // El rol y el estado activo se leen de la BD en cada request, no del token:
  // desactivar o degradar a un usuario surte efecto de inmediato, sin esperar
  // las 8h de vida del JWT.
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, active: true, email: true, fullName: true },
    });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User inactive or not found' });
    }
    req.user = { sub: user.id, role: user.role, email: user.email, fullName: user.fullName };
    next();
  } catch (err) {
    next(err);
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

// Mismo criterio que requireProjectAccess, pero para Workspace (agrupación de
// clientes/agenda/dashboard por equipo, sin tableros de tareas).
async function requireWorkspaceAccess(req, res, next) {
  const { workspaceId } = req.params;
  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'SUPERVISOR';

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

  if (!isPrivileged) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user.sub } },
    });
    if (!membership) return res.status(404).json({ error: 'Workspace not found' });
  }

  req.workspace = workspace;
  req.isWorkspacePrivileged = isPrivileged;
  next();
}

// Verifica la firma HMAC-SHA256 de un webhook externo contra los bytes crudos
// del body (req.rawBody, capturados en app.js antes del parseo JSON). Cada
// integración manda la firma en su propio header y algunas la prefijan
// (p. ej. ZyraVoice manda "sha256=<hex>", RECOGIDA-PAQ manda el hex pelado).
function requireWebhookSignature({ headerName, secretEnvVar, prefix = '' }) {
  return (req, res, next) => {
    const rawSignature = req.headers[headerName];
    const secret = process.env[secretEnvVar];
    if (!rawSignature || !secret || !req.rawBody) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const signature = prefix && String(rawSignature).startsWith(prefix)
      ? String(rawSignature).slice(prefix.length)
      : String(rawSignature);

    const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    const provided = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    next();
  };
}

module.exports = {
  requireAuth, requireRole, requireApiKey, requireProjectAccess, requireWorkspaceAccess, requireWebhookSignature,
};
