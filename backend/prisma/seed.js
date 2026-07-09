require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STATUSES = [
  { name: 'Nuevo', order: 1, isDefault: true },
  { name: 'Contactado', order: 2 },
  { name: 'En seguimiento', order: 3 },
  { name: 'Interesado', order: 4 },
  { name: 'No interesado', order: 5 },
  { name: 'Cerrado-ganado', order: 6 },
  { name: 'Cerrado-perdido', order: 7 },
];

async function main() {
  for (const s of STATUSES) {
    await prisma.status.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@ism.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { fullName: 'Administrador', email: adminEmail, passwordHash, role: 'ADMIN' },
  });

  console.log(`Seed complete. Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
