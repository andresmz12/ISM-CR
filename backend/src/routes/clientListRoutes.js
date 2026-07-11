const express = require('express');
const { z } = require('zod');
const { listLists, createList, renameList, deleteList } = require('../controllers/clientListController');
const { validate } = require('../utils/validate');

const router = express.Router({ mergeParams: true });

const nameSchema = z.object({ name: z.string().min(1).max(80) });

/**
 * @openapi
 * /projects/{projectId}/lists:
 *   get:
 *     summary: List a project's client lists, with client counts
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lists }
 *   post:
 *     summary: Create a client list in this project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: List created }
 */
router.get('/', listLists);
router.post('/', validate(nameSchema), createList);

/**
 * @openapi
 * /projects/{projectId}/lists/{listId}:
 *   patch:
 *     summary: Rename a client list
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List renamed }
 *   delete:
 *     summary: Delete a client list (does not delete its clients)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: List deleted }
 */
router.patch('/:listId', validate(nameSchema), renameList);
router.delete('/:listId', deleteList);

module.exports = router;
