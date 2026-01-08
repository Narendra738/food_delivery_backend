import express from 'express';
import { getMyMenuItems, createMenuItem, deleteMenuItem, updateMenuItem } from './menuItem.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication and RESTAURANT role
router.use(authenticate);
router.use(authorize('RESTAURANT'));

router.get('/my', getMyMenuItems);
router.post('/', createMenuItem);
router.put('/:id', updateMenuItem);
router.delete('/:id', deleteMenuItem);

export default router;
