import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { updateProfile } from './user.controller.js';

const router = express.Router();

router.put('/profile', authenticate, updateProfile);

export default router;
