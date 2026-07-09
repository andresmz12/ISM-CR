const express = require('express');
const { z } = require('zod');
const { createSection, updateSection, deleteSection } = require('../controllers/projectSectionController');
const { validate } = require('../utils/validate');

const router = express.Router({ mergeParams: true });

const createSchema = z.object({ name: z.string().min(1), order: z.number().int().optional() });
const updateSchema = createSchema.partial();

/**
 * @openapi
 * /projects/{projectId}/sections:
 *   post:
 *     summary: Create a section (column) in a project's board
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Section created }
 */
router.post('/', validate(createSchema), createSection);

/**
 * @openapi
 * /projects/{projectId}/sections/{sectionId}:
 *   patch:
 *     summary: Rename or reorder a section
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Section updated }
 *   delete:
 *     summary: Delete a section (also deletes its tasks)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Section deleted }
 */
router.patch('/:sectionId', validate(updateSchema), updateSection);
router.delete('/:sectionId', deleteSection);

module.exports = router;
