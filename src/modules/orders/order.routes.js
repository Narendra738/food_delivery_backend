import express from 'express';
import {
  createOrder,
  acceptOrder,
  acceptOrderByRider,
  updateOrderStatus,
  getMyOrders,
  getAvailableOrdersForRider,
  getOrderById,
} from './order.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/', authorize('USER'), createOrder);
router.get('/my-orders', getMyOrders);
router.get('/available', authorize('RIDER'), getAvailableOrdersForRider);
router.get('/:orderId', getOrderById);

// Restaurant routes
router.post('/:orderId/accept', authorize('RESTAURANT'), acceptOrder);

// Rider routes
router.post('/:orderId/accept-rider', authorize('RIDER'), acceptOrderByRider);

// Status update (can be done by restaurant or rider)
router.patch('/:orderId/status', updateOrderStatus);

export default router;
