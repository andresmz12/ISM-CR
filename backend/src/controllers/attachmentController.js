const prisma = require('../config/prisma');
const { wrapAll } = require('../utils/asyncHandler');
const { clientScopeFilter } = require('../utils/clientScope');

const listSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
};

async function findScopedClient(req) {
  return prisma.client.findFirst({ where: { id: req.params.clientId, ...(await clientScopeFilter(req.user)) } });
}

async function listAttachments(req, res) {
  const client = await findScopedClient(req);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const attachments = await prisma.attachment.findMany({
    where: { clientId: client.id },
    select: listSelect,
    orderBy: { createdAt: 'desc' },
  });
  res.json(attachments);
}

async function uploadAttachment(req, res) {
  const client = await findScopedClient(req);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo (campo "file")' });

  const attachment = await prisma.attachment.create({
    data: {
      clientId: client.id,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype || 'application/octet-stream',
      size: req.file.size,
      data: req.file.buffer,
      uploadedById: req.user.sub,
    },
    select: listSelect,
  });
  res.status(201).json(attachment);
}

async function downloadAttachment(req, res) {
  const client = await findScopedClient(req);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, clientId: client.id },
  });
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
  res.send(Buffer.from(attachment.data));
}

async function deleteAttachment(req, res) {
  const client = await findScopedClient(req);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, clientId: client.id },
    select: { id: true },
  });
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
  await prisma.attachment.delete({ where: { id: attachment.id } });
  res.status(204).send();
}

module.exports = wrapAll({ listAttachments, uploadAttachment, downloadAttachment, deleteAttachment });
