# Zestro Backend API

Production-ready backend for Zestro food ordering application.

## 🚀 Features

- **Authentication**: JWT-based auth with role-based access control
- **Database**: PostgreSQL (Prisma ORM) for transactional data, MongoDB for notifications
- **Real-time**: Socket.IO for live order updates
- **Order Management**: Complete order flow with race-condition safe rider assignment
- **Payment**: Dummy payment system (always succeeds)

## 📦 Tech Stack

- Node.js 18+
- Express.js
- PostgreSQL (Prisma ORM)
- MongoDB (Mongoose)
- Socket.IO
- JWT Authentication

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/zestro
MONGO_URI=mongodb://localhost:27017/zestro
JWT_SECRET=your-secret-key-change-in-production
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account (with role)
- `POST /api/auth/login` - Login (no role needed)
- `GET /api/auth/me` - Get current user

### Restaurants
- `GET /api/restaurants` - Get all restaurants
- `GET /api/restaurants/:id` - Get restaurant by ID
- `POST /api/restaurants` - Create restaurant (RESTAURANT role)
- `GET /api/restaurants/me/restaurant` - Get my restaurant
- `POST /api/restaurants/me/menu-items` - Create menu item
- `PUT /api/restaurants/me/menu-items/:id` - Update menu item
- `DELETE /api/restaurants/me/menu-items/:id` - Delete menu item

### Orders
- `POST /api/orders` - Create order (USER role)
- `GET /api/orders/my-orders` - Get my orders
- `GET /api/orders/available` - Get available orders (RIDER role)
- `GET /api/orders/:orderId` - Get order by ID
- `POST /api/orders/:orderId/accept` - Accept order (RESTAURANT role)
- `POST /api/orders/:orderId/accept-rider` - Accept order (RIDER role)
- `PATCH /api/orders/:orderId/status` - Update order status

### Notifications
- `GET /api/notifications` - Get my notifications
- `PATCH /api/notifications/:notificationId/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read

## 🔌 Socket.IO Events

### Rooms
- `USER:{userId}` - User-specific room
- `RESTAURANT:{restaurantId}` - Restaurant-specific room
- `RIDERS_ONLINE` - All online riders

### Events
- `NEW_ORDER` - New order created (emitted to restaurant)
- `ORDER_ACCEPTED` - Order accepted by restaurant
- `ORDER_ASSIGNED` - Order assigned to rider
- `ORDER_STATUS_UPDATE` - Order status updated

## 🔐 User Roles

- `USER` - Customer
- `RESTAURANT` - Restaurant owner
- `RIDER` - Delivery partner
- `ADMIN` - Admin (optional)

## 🌐 Deployment (Render)

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Set build command: `npm install && npm run prisma:generate`
4. Set start command: `node src/server.js`
5. Enable WebSockets in Render settings

## 📝 Notes

- All passwords are hashed with bcrypt
- JWT tokens expire in 7 days
- Payments always succeed (dummy system)
- Race-condition safe rider assignment using database-level locking
- Notifications are stored in MongoDB only
