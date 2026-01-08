import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import restaurantRoutes from './modules/restaurants/restaurant.routes.js';
import menuItemRoutes from './modules/menuItems/menuItem.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import userRoutes from './modules/users/user.routes.js';

dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow Localhost
    if (origin === 'http://localhost:5173' || origin === 'http://localhost:5000') {
      return callback(null, true);
    }

    // Allow Vercel Deployments (Main domain and previews)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow specific Client URL from env
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }

    // Block others
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware to attach io to requests (must be before routes)
app.use((req, res, next) => {
  req.io = app.get('io');
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
