const express = require('express');
const multer = require('multer');
const { listAttachments, uploadAttachment, downloadAttachment, deleteAttachment } = require('../controllers/attachmentController');

// Los archivos viven en la BD (Railway no tiene disco persistente), así que
// se reciben en memoria y se limita el tamaño para no inflar Postgres.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Montado bajo /clients/:clientId/attachments — hereda requireAuth del router de clientes.
const router = express.Router({ mergeParams: true });

/**
 * @openapi
 * /clients/{clientId}/attachments:
 *   get:
 *     summary: List a client's attachments (metadata only)
 *     tags: [Attachments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Attachments }
 *   post:
 *     summary: Upload an attachment (multipart/form-data, field "file", max 5 MB)
 *     tags: [Attachments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Attachment uploaded }
 */
router.get('/', listAttachments);
router.post('/', upload.single('file'), uploadAttachment);

/**
 * @openapi
 * /clients/{clientId}/attachments/{attachmentId}/download:
 *   get:
 *     summary: Download an attachment's file content
 *     tags: [Attachments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: File stream }
 */
router.get('/:attachmentId/download', downloadAttachment);

/**
 * @openapi
 * /clients/{clientId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete an attachment
 *     tags: [Attachments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Deleted }
 */
router.delete('/:attachmentId', deleteAttachment);

module.exports = router;
