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
  const data = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = active;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { id }, data, select: publicSelect });
  res.json(user);
}

module.exports = wrapAll({ listUsers, createUser, updateUser });
