const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { agentsByLoad, pickAutoAssignAgent } = require('../utils/autoAssign');
const { clientScopeFilter, myFollowUpScopeFilter } = require('../utils/clientScope');

// Normaliza teléfonos a solo dígitos para comparar duplicados
// ("8888-1234" y "88881234" deben coincidir).
function normalizePhone(p) {
  return String(p ?? '').replace(/\D/g, '');
}

// Igual que normalizePhone pero devuelve null para vacíos, que es lo que
// se guarda en las columnas phoneNormalized/phoneAltNormalized.
function normalizePhoneOrNull(p) {
  const n = normalizePhone(p);
  return n || null;
}

// Igual que normalizePhoneOrNull pero para email: minúsculas + trim, para
// matchear sin diferenciar mayúsculas/minúsculas (ver emailNormalized en el schema).
function normalizeEmailOrNull(e) {
  const n = String(e ?? '').trim().toLowerCase();
  return n || null;
}

// Límites del día en la zona horaria del negocio. El servidor corre en UTC
// (Railway); sin este ajuste "hoy" empezaría a las 6-7pm del día anterior.
// Zona IANA para que el horario de verano (DST) se aplique solo.
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'America/Chicago';

// Diferencia (ms) entre la hora local del negocio y UTC en un instante dado.
function tzOffsetMs(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  return asUTC - date.getTime();
}

// Instante UTC de la medianoche local que contiene a localMidnight (expresada
// como Date en "hora local trasladada a UTC"). Doble pasada por si la
// medianoche cae justo al otro lado de un cambio de DST.
function utcInstantOfLocalMidnight(localMidnight, approxOffset) {
  const guess = new Date(localMidnight.getTime() - approxOffset);
  return new Date(localMidnight.getTime() - tzOffsetMs(guess, BUSINESS_TIMEZONE));
}

function businessDayBounds(now = new Date()) {
  const offset = tzOffsetMs(now, BUSINESS_TIMEZONE);
  const local = new Date(now.getTime() + offset);
  local.setUTCHours(0, 0, 0, 0);
  const start = utcInstantOfLocalMidnight(local, offset);
  const nextMidnight = new Date(local.getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(utcInstantOfLocalMidnight(nextMidnight, offset).getTime() - 1);
  return { start, end };
}

async function findDuplicates(phone, phoneAlt, excludeId) {
  // Compara sobre las columnas normalizadas para que "8888-1234" y "88881234"
  // cuenten como el mismo número sin importar cómo se capturaron.
  const phones = [normalizePhoneOrNull(phone), normalizePhoneOrNull(phoneAlt)].filter(Boolean);
  if (phones.length === 0) return [];
  return prisma.client.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      OR: phones.flatMap((p) => [{ phoneNormalized: p }, { phoneAltNormalized: p }]),
    },
    select: { id: true, fullName: true, phone: true, assignedAgent: { select: { fullName: true } } },
    take: 5,
  });
}

async function listClients(req, res) {
  const { search, statusId, excludeStatusIds, assignedAgentId, companyId, projectId, tag, listId, page = '1', pageSize = '25' } = req.query;
  const where = { ...(await clientScopeFilter(req.user)) };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { phoneAlt: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (statusId) where.statusId = statusId;
  // Estatus ocultados desde el picker de Tablero/Tabla (preferencia del navegador,
  // no borra el estatus): se excluyen a nivel de query para que la paginación no
  // se llene de clientes que igual no se van a mostrar.
  if (excludeStatusIds) {
    const ids = String(excludeStatusIds).split(',').filter(Boolean);
    if (ids.length) where.statusId = { notIn: ids };
  }
  if (assignedAgentId && req.user.role !== 'AGENT') where.assignedAgentId = assignedAgentId;
  if (companyId) where.companyId = companyId;
  if (projectId) where.projectId = projectId;
  if (tag) where.tags = { has: tag };
  if (listId) where.listItems = { some: { listId } };

  const take = Math.min(parseInt(pageSize, 10) || 25, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        status: true,
        assignedAgent: { select: { id: true, fullName: true } },
        company: { select: { id: true, name: true } },
        listItems: { include: { list: { select: { id: true, name: true } } } },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { notes: true, createdAt: true, user: { select: { fullName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.client.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), pageSize: take });
}

async function getClient(req, res) {
  const { id } = req.params;
  const client = await prisma.client.findFirst({
    where: { id, ...(await clientScopeFilter(req.user)) },
    include: {
      status: true,
      assignedAgent: { select: { id: true, fullName: true } },
      company: true,
      project: { select: { id: true, name: true } },
      listItems: { include: { list: { select: { id: true, name: true } } } },
      interactions: {
        include: { user: { select: { id: true, fullName: true } }, resultStatus: true },
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
}

async function createClient(req, res) {
  const { fullName, phone, phoneAlt, email, address, statusId, assignedAgentId, companyId, projectId, source, tags, nextFollowUpAt, autoAssign, listIds } = req.body;
  let finalStatusId = statusId;
  if (!finalStatusId) {
    const def = await prisma.status.findFirst({ where: { isDefault: true } });
    finalStatusId = def ? def.id : undefined;
  }

  const duplicates = await findDuplicates(phone, phoneAlt);
  // Un AGENT no puede asignar el cliente a otro agente al crearlo.
  const preAssignedAgentId = req.user.role === 'AGENT' ? req.user.sub : (assignedAgentId ?? undefined);

  // La elección de agente (si aplica auto-asignación) y la creación van en la misma
  // transacción que sostiene el advisory lock del round-robin (ver autoAssign.js),
  // para que creaciones concurrentes no terminen asignadas al mismo agente.
  const client = await prisma.$transaction(async (tx) => {
    let finalAssignedAgentId = preAssignedAgentId;
    if (!finalAssignedAgentId && autoAssign) {
      finalAssignedAgentId = (await pickAutoAssignAgent(tx)) ?? undefined;
    }
    return tx.client.create({
      data: {
        fullName,
        phone,
        phoneAlt,
        phoneNormalized: normalizePhoneOrNull(phone),
        phoneAltNormalized: normalizePhoneOrNull(phoneAlt),
        email,
        emailNormalized: normalizeEmailOrNull(email),
        address,
        statusId: finalStatusId,
        assignedAgentId: finalAssignedAgentId,
        companyId,
        projectId,
        source,
        tags: tags ?? [],
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
        listItems: listIds?.length ? { create: listIds.map((listId) => ({ listId })) } : undefined,
      },
      include: {
        status: true,
        assignedAgent: { select: { id: true, fullName: true } },
        company: { select: { id: true, name: true } },
        listItems: { include: { list: { select: { id: true, name: true } } } },
      },
    });
  });

  res.status(201).json({ ...client, duplicateWarning: duplicates.length > 0 ? duplicates : undefined });
}

async function updateClient(req, res) {
  const { id } = req.params;
  const existing = await prisma.client.findFirst({ where: { id, ...(await clientScopeFilter(req.user)) } });
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const { fullName, phone, phoneAlt, email, address, statusId, companyId, projectId, source, tags, nextFollowUpAt, listIds } = req.body;
  const data = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (phone !== undefined) {
    data.phone = phone;
    data.phoneNormalized = normalizePhoneOrNull(phone);
  }
  if (phoneAlt !== undefined) {
    data.phoneAlt = phoneAlt;
    data.phoneAltNormalized = normalizePhoneOrNull(phoneAlt);
  }
  if (email !== undefined) {
    data.email = email;
    data.emailNormalized = normalizeEmailOrNull(email);
  }
  if (address !== undefined) data.address = address;
  if (statusId !== undefined) data.statusId = statusId;
  if (companyId !== undefined) data.companyId = companyId;
  if (projectId !== undefined) data.projectId = projectId;
  if (source !== undefined) data.source = source;
  if (tags !== undefined) data.tags = tags;
  if (nextFollowUpAt !== undefined) data.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
  // Reemplaza el conjunto completo de listas del cliente (no es un merge/append).
  if (listIds !== undefined) data.listItems = { deleteMany: {}, create: listIds.map((listId) => ({ listId })) };

  const auditEntries = [];
  if (statusId !== undefined && statusId !== existing.statusId) {
    auditEntries.push({ clientId: id, userId: req.user.sub, field: 'statusId', oldValue: existing.statusId, newValue: statusId });
  }

  // Si cambió algún teléfono, avisar (sin bloquear) si ahora coincide con otro cliente.
  const phonesChanged = phone !== undefined || phoneAlt !== undefined;
  const duplicates = phonesChanged
    ? await findDuplicates(phone ?? existing.phone, phoneAlt ?? existing.phoneAlt, id)
    : [];

  const [client] = await prisma.$transaction([
    prisma.client.update({
      where: { id },
      data,
      include: {
        status: true,
        assignedAgent: { select: { id: true, fullName: true } },
        company: { select: { id: true, name: true } },
        listItems: { include: { list: { select: { id: true, name: true } } } },
      },
    }),
    ...auditEntries.map((entry) => prisma.auditLog.create({ data: entry })),
  ]);
  res.json({ ...client, duplicateWarning: duplicates.length > 0 ? duplicates : undefined });
}

async function deleteClient(req, res) {
  const { id } = req.params;
  const existing = await prisma.client.findFirst({ where: { id, ...(await clientScopeFilter(req.user)) } });
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  await prisma.client.delete({ where: { id } });
  res.status(204).send();
}

async function reassignClient(req, res) {
  const { id } = req.params;
  const { agentId } = req.body;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const [updated] = await prisma.$transaction([
    prisma.client.update({ where: { id }, data: { assignedAgentId: agentId } }),
    prisma.clientAssignment.create({
      data: {
        clientId: id,
        fromAgentId: client.assignedAgentId,
        toAgentId: agentId,
        reassignedById: req.user.sub,
      },
    }),
    prisma.auditLog.create({
      data: {
        clientId: id,
        userId: req.user.sub,
        field: 'assignedAgentId',
        oldValue: client.assignedAgentId,
        newValue: agentId,
      },
    }),
  ]);
  res.json(updated);
}

async function dailyTasks(req, res) {
  const { start, end } = businessDayBounds();
  const { projectId } = req.query;

  const where = {
    ...(await myFollowUpScopeFilter(req.user)),
    ...(projectId ? { projectId } : {}),
    nextFollowUpAt: { gte: start, lte: end },
  };

  const items = await prisma.client.findMany({
    where,
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { nextFollowUpAt: 'asc' },
  });
  res.json(items);
}

async function rangeTasks(req, res) {
  const { start, end, projectId } = req.query;
  const where = {
    ...(await myFollowUpScopeFilter(req.user)),
    ...(projectId ? { projectId } : {}),
    nextFollowUpAt: { gte: new Date(start), lte: new Date(end) },
  };

  const items = await prisma.client.findMany({
    where,
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { nextFollowUpAt: 'asc' },
  });
  res.json(items);
}

async function overdueTasks(req, res) {
  // Vencidas = antes de hoy (día del negocio); las de hoy viven en /tasks/today
  // y así una tarea no aparece en ambas listas a la vez.
  const { start } = businessDayBounds();
  const { projectId } = req.query;
  const where = {
    ...(await myFollowUpScopeFilter(req.user)),
    ...(projectId ? { projectId } : {}),
    nextFollowUpAt: { lt: start },
  };

  const items = await prisma.client.findMany({
    where,
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { nextFollowUpAt: 'asc' },
  });
  res.json(items);
}

// Leads que nunca han sido contactados y ya pasaron el SLA de primer contacto.
async function uncontactedLeads(req, res) {
  const hours = Math.max(parseInt(req.query.hours, 10) || parseInt(process.env.SLA_FIRST_CONTACT_HOURS ?? '24', 10), 1);
  const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);

  const items = await prisma.client.findMany({
    where: {
      ...(await myFollowUpScopeFilter(req.user)),
      lastContactedAt: null,
      createdAt: { lt: threshold },
    },
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ hours, items });
}

// Clientes "fríos": sí fueron contactados alguna vez, pero hace más de N días.
async function staleClients(req, res) {
  const days = Math.max(parseInt(req.query.days, 10) || parseInt(process.env.SLA_STALE_DAYS ?? '7', 10), 1);
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const items = await prisma.client.findMany({
    where: {
      ...(await myFollowUpScopeFilter(req.user)),
      lastContactedAt: { lt: threshold },
    },
    include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    orderBy: { lastContactedAt: 'asc' },
    take: 200,
  });
  res.json({ days, items });
}

// Posibles duplicados de un cliente ya existente (por teléfono normalizado).
async function clientDuplicates(req, res) {
  const { id } = req.params;
  const client = await prisma.client.findFirst({ where: { id, ...(await clientScopeFilter(req.user)) } });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const duplicates = await findDuplicates(client.phone, client.phoneAlt, id);
  res.json(duplicates);
}

// Fusiona el cliente `sourceId` dentro de `:id` (el que se conserva): mueve
// interacciones, deals, adjuntos, asignaciones y auditoría; completa campos
// vacíos del destino con los del origen; y elimina el origen.
async function mergeClients(req, res) {
  const { id } = req.params;
  const { sourceId } = req.body;
  if (sourceId === id) return res.status(400).json({ error: 'No se puede fusionar un cliente consigo mismo' });

  const scope = await clientScopeFilter(req.user);
  const [target, source] = await Promise.all([
    prisma.client.findFirst({ where: { id, ...scope } }),
    prisma.client.findFirst({ where: { id: sourceId, ...scope } }),
  ]);
  if (!target || !source) return res.status(404).json({ error: 'Client not found' });

  const fill = {};
  if (!target.phoneAlt && source.phone !== target.phone) fill.phoneAlt = source.phone;
  if (!target.email && source.email) {
    fill.email = source.email;
    fill.emailNormalized = normalizeEmailOrNull(source.email);
  }
  if (!target.address && source.address) fill.address = source.address;
  if (!target.source && source.source) fill.source = source.source;
  if (!target.companyId && source.companyId) fill.companyId = source.companyId;
  if (!target.assignedAgentId && source.assignedAgentId) fill.assignedAgentId = source.assignedAgentId;
  if (!target.nextFollowUpAt && source.nextFollowUpAt) fill.nextFollowUpAt = source.nextFollowUpAt;
  if (source.lastContactedAt && (!target.lastContactedAt || source.lastContactedAt > target.lastContactedAt)) {
    fill.lastContactedAt = source.lastContactedAt;
  }
  if (fill.phoneAlt) fill.phoneAltNormalized = normalizePhoneOrNull(fill.phoneAlt);
  const mergedTags = Array.from(new Set([...(target.tags ?? []), ...(source.tags ?? [])]));
  if (mergedTags.length !== target.tags.length) fill.tags = mergedTags;

  const [merged] = await prisma.$transaction([
    prisma.client.update({
      where: { id },
      data: fill,
      include: { status: true, assignedAgent: { select: { id: true, fullName: true } } },
    }),
    prisma.interaction.updateMany({ where: { clientId: sourceId }, data: { clientId: id } }),
    prisma.deal.updateMany({ where: { clientId: sourceId }, data: { clientId: id } }),
    prisma.attachment.updateMany({ where: { clientId: sourceId }, data: { clientId: id } }),
    prisma.clientAssignment.updateMany({ where: { clientId: sourceId }, data: { clientId: id } }),
    prisma.auditLog.updateMany({ where: { clientId: sourceId }, data: { clientId: id } }),
    prisma.auditLog.create({
      data: {
        clientId: id,
        userId: req.user.sub,
        field: 'merge',
        oldValue: `${source.fullName} (${source.phone})`,
        newValue: 'fusionado en este cliente',
      },
    }),
    prisma.client.delete({ where: { id: sourceId } }),
  ]);
  res.json(merged);
}

async function importClients(req, res) {
  const { rows, duplicateAction = 'skip', autoAssign = false, projectId, listId } = req.body;

  if (listId) {
    const list = await prisma.clientList.findFirst({ where: { id: listId, projectId } });
    if (!list) return res.status(400).json({ error: 'La lista indicada no existe en esta empresa' });
  }

  // Para repartir filas sin agente cuando se pide auto-asignación: se parte de
  // la carga actual y se va incrementando en memoria para que el lote quede parejo.
  const ranked = autoAssign && req.user.role !== 'AGENT' ? await agentsByLoad() : [];
  function nextAgentId() {
    if (ranked.length === 0) return undefined;
    let min = ranked[0];
    for (const a of ranked) if (a.load < min.load) min = a;
    min.load += 1;
    return min.id;
  }

  const [statuses, defaultStatus, existingClients] = await Promise.all([
    prisma.status.findMany(),
    prisma.status.findFirst({ where: { isDefault: true } }),
    prisma.client.findMany({ select: { phone: true, phoneAlt: true } }),
  ]);

  const statusByName = new Map(statuses.map((s) => [s.name.trim().toLowerCase(), s.id]));
  const knownPhones = new Set();
  for (const c of existingClients) {
    if (c.phone) knownPhones.add(normalizePhone(c.phone));
    if (c.phoneAlt) knownPhones.add(normalizePhone(c.phoneAlt));
  }

  const results = { created: 0, duplicates: 0, errors: [] };
  const toCreate = [];

  rows.forEach((row, index) => {
    const fullName = String(row.fullName ?? '').trim() || String(row.phone ?? '').trim();
    const phone = String(row.phone ?? '').trim();
    if (!phone) {
      results.errors.push({ row: index + 1, error: 'El teléfono es obligatorio' });
      return;
    }

    let statusId = defaultStatus?.id;
    if (row.statusName) {
      const matched = statusByName.get(String(row.statusName).trim().toLowerCase());
      if (matched) statusId = matched;
    }
    if (!statusId) {
      results.errors.push({ row: index + 1, error: 'No hay estatus por defecto configurado' });
      return;
    }

    const normPhone = normalizePhone(phone);
    const isDuplicate = knownPhones.has(normPhone);
    if (isDuplicate) {
      results.duplicates += 1;
      if (duplicateAction === 'skip') return;
    }
    knownPhones.add(normPhone);

    const phoneAltTrimmed = row.phoneAlt ? String(row.phoneAlt).trim() : undefined;
    toCreate.push({
      fullName,
      phone,
      phoneNormalized: normPhone || null,
      phoneAlt: phoneAltTrimmed,
      phoneAltNormalized: normalizePhoneOrNull(phoneAltTrimmed),
      email: row.email ? String(row.email).trim() : undefined,
      emailNormalized: row.email ? normalizeEmailOrNull(row.email) : undefined,
      address: row.address ? String(row.address).trim() : undefined,
      source: row.source ? String(row.source).trim() : undefined,
      tags: Array.isArray(row.tags) ? row.tags : [],
      statusId,
      assignedAgentId: req.user.role === 'AGENT'
        ? req.user.sub
        : (row.assignedAgentId || nextAgentId()),
      projectId: projectId || undefined,
    });
  });

  if (toCreate.length > 0) {
    if (listId) {
      // createMany no admite relaciones anidadas (no hay forma de conectar
      // listItems en el mismo statement), así que con lista se crea una por una
      // dentro de una transacción — más lento que createMany, pero acotado a
      // las 5000 filas máximas del import y necesario para asociar la lista.
      // Timeout explícito: con miles de creates individuales, el default de
      // Prisma (5s) se queda corto y la transacción fallaría a mitad de camino.
      const created = await prisma.$transaction(
        toCreate.map((data) => prisma.client.create({ data: { ...data, listItems: { create: [{ listId }] } } })),
        { timeout: 120000 }
      );
      results.created = created.length;
    } else {
      const created = await prisma.client.createMany({ data: toCreate });
      results.created = created.count;
    }
  }

  res.status(201).json(results);
}

module.exports = wrapAll({
  listClients, getClient, createClient, updateClient, deleteClient, reassignClient, dailyTasks, overdueTasks, rangeTasks, importClients,
  uncontactedLeads, staleClients, clientDuplicates, mergeClients,
});
