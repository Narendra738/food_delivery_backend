# Frontend-Backend Integration Guide

## Role Mapping

The frontend uses different role names than the backend:

**Frontend** → **Backend**
- `Customer` → `USER`
- `Restaurant` → `RESTAURANT`
- `Rider` → `RIDER`

You'll need to map roles when calling the backend API.

## API Base URL

Set environment variable in frontend `.env`:
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Authentication Flow

1. **Signup**: `POST /api/auth/signup`
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "password": "password123",
     "role": "USER" // or "RESTAURANT" or "RIDER"
   }
   ```
   Returns: `{ user, token }`

2. **Login**: `POST /api/auth/login`
   ```json
   {
     "email": "john@example.com",
     "password": "password123"
   }
   ```
   Returns: `{ user, token }`

3. **Store token**: Save JWT token to localStorage as `zestro_token`

4. **Use token**: Include in requests as `Authorization: Bearer <token>`

## Socket.IO Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('zestro_token')
  }
});
```

## Example API Calls

### Create Order (USER)
```javascript
const response = await fetch('http://localhost:5000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    restaurantId: 'restaurant-id',
    items: [
      { menuItemId: 'item-id', quantity: 2 }
    ]
  })
});
```

### Accept Order (RESTAURANT)
```javascript
await fetch(`http://localhost:5000/api/orders/${orderId}/accept`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Accept Order as Rider (RIDER)
```javascript
await fetch(`http://localhost:5000/api/orders/${orderId}/accept-rider`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Update Order Status
```javascript
await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'PICKED' // or 'DELIVERED'
  })
});
```

## Socket Events

### Listen for Events

**Customer (USER):**
```javascript
socket.on('ORDER_STATUS_UPDATE', (data) => {
  // data: { orderId, status, order }
});
```

**Restaurant (RESTAURANT):**
```javascript
socket.on('NEW_ORDER', (order) => {
  // New order received
});

socket.on('ORDER_STATUS_UPDATE', (data) => {
  // Order status changed
});
```

**Rider (RIDER):**
```javascript
socket.on('ORDER_ASSIGNED', (order) => {
  // New order available
});
```
