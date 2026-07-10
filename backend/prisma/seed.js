require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
  // Este script corre en cada arranque del contenedor (ver Dockerfile). Si no hay
  // SEED_ADMIN_PASSWORD, en vez de caer a una contraseña fija conocida (que además
  // vive en el historial público del repo), se genera una aleatoria por arranque:
  // el upsert con update:{} la ignora si el admin ya existe, así que solo importa
  // en el primer arranque, y en ese caso queda impresa una única vez en los logs
  // de Railway (accesibles solo para el equipo) para poder loguearse y cambiarla.
  const generatedPassword = !process.env.SEED_ADMIN_PASSWORD ? crypto.randomBytes(12).toString('base64url') : null;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || generatedPassword;
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const { created: adminCreated } = await prisma.user.findUnique({ where: { email: adminEmail } })
    .then((existing) => ({ created: !existing }));
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { fullName: 'Administrador', email: adminEmail, passwordHash, role: 'ADMIN' },
  });
  if (adminCreated && generatedPassword) {
    console.log(
      `Admin creado con contraseña generada (guárdala, no se volverá a mostrar): ${adminEmail} / ${generatedPassword}`
    );
  }

  // Usuario "Sistema" para atribuir las interacciones creadas por integraciones
  // externas (paquetería, etc.) sin contaminar las métricas de los agentes reales.
  // Inactivo y con contraseña aleatoria: no puede iniciar sesión.
  const systemEmail = process.env.SYSTEM_USER_EMAIL || 'sistema@ism.local';
  await prisma.user.upsert({
    where: { email: systemEmail },
    update: {},
    create: {
      fullName: 'Sistema (integraciones)',
      email: systemEmail,
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      role: 'AGENT',
      active: false,
    },
  });

  // No imprimir la contraseña: este script corre en cada arranque y quedaría en los logs.
  console.log(`Seed complete. Admin: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
