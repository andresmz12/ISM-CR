const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

const publicSelect = { id: true, fullName: true, email: true, role: true, active: true, createdAt: true };

async function listUsers(req, res) {
  const users = await prisma.user.findMany({ select: publicSelect, orderBy: { fullName: 'asc' } });
  res.json(users);
}

async function createUser(req, res) {
  const { fullName, email, password, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { fullName, email, passwordHash, role },
    select: publicSelect,
  });
  res.status(201).json(user);
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { fullName, role, active, password } = req.body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (id === req.user.sub) {
    if (active === false) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }
    if (role !== undefined && role !== 'ADMIN') {
      return res.status(400).json({ error: 'No puedes quitarte a ti mismo el rol de administrador' });
    }
  }

  // Evita dejar el sistema sin ningún administrador activo.
  const losesAdmin = target.role === 'ADMIN' && target.active
    && ((role !== undefined && role !== 'ADMIN') || active === false);
  if (losesAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { role: 'ADMIN', active: true, id: { not: id } },
    });
    if (otherAdmins === 0) {
      return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
    }
  }

  const data = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = active;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { id }, data, select: publicSelect });
  res.json(user);
}

async function deleteUser(req, res) {
  const { id } = req.params;
  if (id === req.user.sub) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Igual que al desactivar: no dejar el sistema sin ningún administrador activo.
  if (target.role === 'ADMIN' && target.active) {
    const otherAdmins = await prisma.user.count({
      where: { role: 'ADMIN', active: true, id: { not: id } },
    });
    if (otherAdmins === 0) {
      return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
    }
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}

module.exports = wrapAll({ listUsers, createUser, updateUser, deleteUser });
