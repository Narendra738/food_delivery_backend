# Backend Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database
- MongoDB database

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create `.env` file in the backend directory:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/zestro
MONGO_URI=mongodb://localhost:27017/zestro
JWT_SECRET=your-very-secret-key-change-in-production
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 4. Database Setup

**PostgreSQL:**
```bash
# Generate Prisma Client
npm run prisma:generate

# Create database (if not exists)
createdb zestro

# Run migrations
npm run prisma:migrate
```

**MongoDB:**
- Make sure MongoDB is running
- The connection will be established automatically on server start

### 5. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will start on `http://localhost:5000`

## Testing the API

### 1. Create a User (Signup)
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "USER"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Save the token from the response.

### 3. Create Restaurant (as RESTAURANT user)
```bash
curl -X POST http://localhost:5000/api/restaurants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Spice Garden",
    "cuisine": "North Indian",
    "banner": "https://example.com/banner.jpg"
  }'
```

### 4. Create Menu Item
```bash
curl -X POST http://localhost:5000/api/restaurants/me/menu-items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Butter Chicken",
    "description": "Creamy tomato-based curry",
    "price": 350,
    "image": "https://example.com/food.jpg",
    "veg": false
  }'
```

## Render Deployment

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Set these environment variables:
   - `PORT` (Render will set this automatically)
   - `DATABASE_URL` (from Render PostgreSQL database)
   - `MONGO_URI` (from Render MongoDB database)
   - `JWT_SECRET` (generate a strong random string)
   - `CLIENT_URL` (your Vercel frontend URL)
   - `NODE_ENV=production`

4. Build Command:
   ```bash
   npm install && npm run prisma:generate
   ```

5. Start Command:
   ```bash
   node src/server.js
   ```

6. **Enable WebSockets** in Render settings

## Testing Order Flow

1. **USER** creates an order → status: `PLACED`
2. **RESTAURANT** accepts order → status: `ACCEPTED`, emits to all riders
3. **RIDER** accepts order → status: `PREPARING`, rider assigned (race-condition safe)
4. **RIDER** updates status to `PICKED`
5. **RIDER** updates status to `DELIVERED`

All updates are sent via Socket.IO in real-time!

## Health Check

```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```
