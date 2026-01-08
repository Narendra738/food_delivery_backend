import express from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notification.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:notificationId/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);

export default router;
