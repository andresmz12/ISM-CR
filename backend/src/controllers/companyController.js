const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');

async function listCompanies(req, res) {
  const { search } = req.query;
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};

  const companies = await prisma.company.findMany({
    where,
    include: { _count: { select: { clients: true, deals: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(companies);
}

async function getCompany(req, res) {
  const { id } = req.params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      clients: {
        include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
        orderBy: { fullName: 'asc' },
      },
      deals: {
        include: { owner: { select: { id: true, fullName: true } }, client: { select: { id: true, fullName: true } } },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
}

async function createCompany(req, res) {
  const { name, industry, phone, website, address, notes } = req.body;
  const company = await prisma.company.create({ data: { name, industry, phone, website, address, notes } });
  res.status(201).json(company);
}

async function updateCompany(req, res) {
  const { id } = req.params;
  const { name, industry, phone, website, address, notes } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (industry !== undefined) data.industry = industry;
  if (phone !== undefined) data.phone = phone;
  if (website !== undefined) data.website = website;
  if (address !== undefined) data.address = address;
  if (notes !== undefined) data.notes = notes;
  const company = await prisma.company.update({ where: { id }, data });
  res.json(company);
}

async function deleteCompany(req, res) {
  const { id } = req.params;
  await prisma.company.delete({ where: { id } });
  res.status(204).send();
}

module.exports = wrapAll({ listCompanies, getCompany, createCompany, updateCompany, deleteCompany });
