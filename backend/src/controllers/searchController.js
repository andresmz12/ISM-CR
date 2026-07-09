const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

// Búsqueda global: clientes, empresas y deals en paralelo, respetando el
// scoping por rol (un AGENT solo ve sus clientes y sus deals).
async function globalSearch(req, res) {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ clients: [], companies: [], deals: [] });

  const clientScope = req.user.role === 'AGENT' ? { assignedAgentId: req.user.sub } : {};
  const dealScope = req.user.role === 'AGENT' ? { ownerId: req.user.sub } : {};
  const contains = { contains: q, mode: 'insensitive' };

  const [clients, companies, deals] = await Promise.all([
    prisma.client.findMany({
      where: {
        ...clientScope,
        OR: [{ fullName: contains }, { phone: contains }, { phoneAlt: contains }, { email: contains }],
      },
      select: { id: true, fullName: true, phone: true, email: true, status: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
    prisma.company.findMany({
      where: { OR: [{ name: contains }, { phone: contains }, { website: contains }] },
      select: { id: true, name: true, industry: true },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    }),
    prisma.deal.findMany({
      where: { ...dealScope, title: contains },
      select: { id: true, title: true, stage: true, amount: true, client: { select: { id: true, fullName: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    }),
  ]);

  res.json({ clients, companies, deals });
}

module.exports = wrapAll({ globalSearch });
