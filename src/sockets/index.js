import prisma from '../config/postgres.js';

export const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      // Try auth.token first, then Authorization header
      let token = socket.handshake.auth?.token;

      if (!token) {
        const authHeader = socket.handshake.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

      // Attach user info to socket
      socket.user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, role } = socket.user;

    console.log(`Socket connected: ${userId} (${role})`);

    // Join "personal" room for notifications (USER:{userId})
    socket.join(`USER:${userId}`);
    console.log(`User ${userId} joined USER:${userId}`);

    // Join role-based room (e.g. RIDER:{userId}) to keep existing logic working if any
    if (role !== 'USER') { // 'USER' role already joined above
      socket.join(`${role}:${userId}`);
    }

    // Riders join the RIDERS_ONLINE room
    if (role === 'RIDER') {
      socket.join('RIDERS_ONLINE');
      console.log(`Rider ${userId} joined RIDERS_ONLINE`);
    }

    // RESTAURANT joins restaurant room (need to get restaurant ID)
    if (role === 'RESTAURANT') {
      try {
        const restaurant = await prisma.restaurant.findUnique({
          where: { ownerId: userId },
          select: { id: true },
        });

        if (restaurant) {
          socket.join(`RESTAURANT:${restaurant.id}`);
          console.log(`Restaurant ${restaurant.id} joined RESTAURANT:${restaurant.id}`);
        }
      } catch (error) {
        console.error('Error joining restaurant room:', error);
      }
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${userId} (${role})`);
    });

    // Handle custom events if needed
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  return io;
};
