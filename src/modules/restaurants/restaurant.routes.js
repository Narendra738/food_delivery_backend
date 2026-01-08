import express from 'express';
import {
  createRestaurant,
  updateRestaurant,
  getMyRestaurant,
  getAllRestaurants,
  getRestaurantById,
  getRestaurantMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from './restaurant.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllRestaurants);
router.get('/:id', getRestaurantById);
router.get('/:id/menu', getRestaurantMenu);

// Protected routes
router.post('/', authenticate, authorize('RESTAURANT'), createRestaurant);
router.get('/me/restaurant', authenticate, authorize('RESTAURANT'), getMyRestaurant);
router.put('/me/restaurant', authenticate, authorize('RESTAURANT'), updateRestaurant);
router.post('/me/menu-items', authenticate, authorize('RESTAURANT'), createMenuItem);
router.put('/me/menu-items/:id', authenticate, authorize('RESTAURANT'), updateMenuItem);
router.delete('/me/menu-items/:id', authenticate, authorize('RESTAURANT'), deleteMenuItem);

export default router;
