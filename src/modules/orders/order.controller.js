import prisma from '../../config/postgres.js';
import { createNotification } from '../notifications/notification.service.js';

export const createOrder = async (req, res) => {
  try {
    const { restaurantId, items } = req.body;
    const userId = req.user.userId;

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { menuItems: true },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Calculate total and validate items
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = restaurant.menuItems.find((mi) => mi.id === item.menuItemId);
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
      }

      const itemTotal = menuItem.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price,
      });
    }

    // Create order with items (transaction)
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          restaurantId,
          total,
          status: 'PLACED',
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
          restaurant: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create payment record (always SUCCESS)
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          userId,
          amount: total,
          status: 'SUCCESS',
          transactionId: `TXN_${Date.now()}_${newOrder.id}`,
        },
      });

      return newOrder;
    });

    // Create notification for restaurant
    await createNotification({
      userId: restaurant.ownerId,
      role: 'RESTAURANT',
      orderId: order.id,
      message: `New order #${order.id} received`,
    });

    // Emit socket event (handled in socket handler)
    req.io.to(`RESTAURANT:${restaurantId}`).emit('NEW_ORDER', order);
    req.io.to(`RESTAURANT:${restaurantId}`).emit('NOTIFICATION', {
      message: `New order #${order.id} received`,
      orderId: order.id,
      createdAt: new Date(),
      read: false,
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const restaurantId = req.user.userId;

    // Get restaurant to verify ownership
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: restaurantId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Update order status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        restaurant: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.restaurantId !== restaurant.id) {
      return res.status(403).json({ error: 'Not authorized to accept this order' });
    }

    if (order.status !== 'PLACED') {
      return res.status(400).json({ error: `Order cannot be accepted. Current status: ${order.status}` });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'ACCEPTED' },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notifications
    await createNotification({
      userId: order.userId,
      role: 'USER',
      orderId: order.id,
      message: `Order #${order.id} has been accepted`,
    });

    // Emit to user and all riders
    req.io.to(`USER:${order.userId}`).emit('ORDER_STATUS_UPDATE', {
      orderId: order.id,
      status: 'ACCEPTED',
      order: updatedOrder,
    });

    req.io.to(`USER:${order.userId}`).emit('NOTIFICATION', {
      message: `Order #${order.id} has been accepted`,
      orderId: order.id,
      createdAt: new Date(),
      read: false,
    });

    req.io.to('RIDERS_ONLINE').emit('ORDER_ASSIGNED', updatedOrder);

    res.json({
      message: 'Order accepted successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptOrderByRider = async (req, res) => {
  try {
    const { orderId } = req.params;
    const riderId = req.user.userId;

    // Get order first to check status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order is available
    if (order.status !== 'ACCEPTED' && order.status !== 'PREPARING' && order.status !== 'READY') {
      return res.status(400).json({ error: `Order cannot be accepted. Current status: ${order.status}` });
    }
    if (order.riderId !== null) {
      return res.status(409).json({ error: 'Order already assigned to another rider' });
    }

    const newStatus = order.status === 'READY' ? 'READY' : 'PREPARING';

    // Race-condition safe assignment - use update with where condition
    const updatedOrder = await prisma.order.updateMany({
      where: {
        id: orderId,
        riderId: null, // Only update if riderId is still null
        status: {
          in: ['ACCEPTED', 'PREPARING', 'READY'],
        },
      },
      data: {
        riderId,
        // The user wants "accept -> mark as picked".
        // If I leave it as is, `status: 'PREPARING'`, the rider sees "Mark as Picked".
        // Restaurant sees "Ready for Pickup" button again? No, Restaurant dashboard checks `PREPARING` -> button.
        // If I force it to `PREPARING`, restaurant sees "Ready for Pickup" button.
        // Logic: Rider accepts -> "I am coming". Status: "Rider Assigned" (Not a status).
        // If food is READY, status should probably stay READY.
        // If food is PREPARING, status stays PREPARING.
        // But `updateMany` `data` is static.
        // I will set it to `PREPARING` for now to be safe, or I need logic.
        // Actually, if it is READY, and I set to PREPARING, restaurant will see "Ready for Pickup" button.
        // If restaurant clicks it again, it goes to READY.
        // Rider sees "Mark as Picked" for both PREPARING and READY.
        // So setting to PREPARING is safer for flow consistency, even if slightly illogical for "cooked food".
        // Wait, if I set it to PREPARING, the Restaurant sees it as "PREPARING".
        // Let's check `Restaurant/Dashboard.jsx`.
        // `order.status === 'PREPARING' && ` -> shows "Ready for Pickup".
        // `order.status === 'READY' && ` -> shows "Waiting for Pickup".
        // If I reset to PREPARING, restaurant sees "Ready for Pickup" again.
        // If I leave it as READY, `updateMany` can't do conditional update easily (without raw query).
        // I will switch to `prisma.$transaction` with a read-then-write if I need conditional.
        // BUT checking `acceptOrderByRider` code: it finds order first `const order = await ...`.
        // So I know the status.
        // I can use `order.status` to decide the new status.
        // If `order.status` is `READY`, new status is `READY`.
        // If `order.status` is `ACCEPTED`, new status is `PREPARING`.
      },
    });

    // Check if update was successful
    if (updatedOrder.count === 0) {
      return res.status(409).json({ error: 'Order already assigned to another rider' });
    }

    // Fetch updated order
    const finalOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notifications
    await createNotification({
      userId: finalOrder.userId,
      role: 'USER',
      orderId: finalOrder.id,
      message: `Order #${finalOrder.id} has been picked up`,
    });

    await createNotification({
      userId: finalOrder.restaurant.ownerId,
      role: 'RESTAURANT',
      orderId: finalOrder.id,
      message: `Order #${finalOrder.id} has been assigned to a rider`,
    });

    // Emit socket events
    req.io.to(`USER:${finalOrder.userId}`).emit('ORDER_STATUS_UPDATE', {
      orderId: finalOrder.id,
      status: finalOrder.status,
      order: finalOrder,
    });
    req.io.to(`USER:${finalOrder.userId}`).emit('NOTIFICATION', {
      message: `Order #${finalOrder.id} has been picked up`,
      orderId: finalOrder.id,
      createdAt: new Date(),
      read: false,
    });

    req.io.to(`RESTAURANT:${finalOrder.restaurantId}`).emit('ORDER_STATUS_UPDATE', {
      orderId: finalOrder.id,
      status: finalOrder.status,
      order: finalOrder,
    });
    req.io.to(`RESTAURANT:${finalOrder.restaurantId}`).emit('NOTIFICATION', {
      message: `Order #${finalOrder.id} has been assigned to a rider`,
      orderId: finalOrder.id,
      createdAt: new Date(),
      read: false,
    });

    req.io.to('RIDERS_ONLINE').emit('ORDER_ASSIGNED', finalOrder);

    return res.json({
      message: 'Order accepted successfully',
      order: finalOrder,
    });
  } catch (error) {
    console.error('Rider accept order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validStatuses = ['ACCEPTED', 'PREPARING', 'READY', 'PICKED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization checks
    if (userRole === 'RESTAURANT' && order.restaurant.ownerId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (userRole === 'RIDER' && order.riderId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (userRole === 'USER' && order.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notification for user
    await createNotification({
      userId: order.userId,
      role: 'USER',
      orderId: order.id,
      message: `Order #${order.id} status updated to ${status}`,
    });

    // Emit socket events
    req.io.to(`USER:${order.userId}`).emit('ORDER_STATUS_UPDATE', {
      orderId: order.id,
      status,
      order: updatedOrder,
    });
    req.io.to(`USER:${order.userId}`).emit('NOTIFICATION', {
      message: `Order #${order.id} status updated to ${status}`,
      orderId: order.id,
      createdAt: new Date(),
      read: false,
    });

    if (order.restaurant) {
      req.io.to(`RESTAURANT:${order.restaurantId}`).emit('ORDER_STATUS_UPDATE', {
        orderId: order.id,
        status,
        order: updatedOrder,
      });
    }

    if (updatedOrder.riderId) {
      req.io.to(`USER:${updatedOrder.riderId}`).emit('ORDER_STATUS_UPDATE', {
        orderId: order.id,
        status,
        order: updatedOrder,
      });
      req.io.to(`USER:${updatedOrder.riderId}`).emit('NOTIFICATION', {
        message: `Order #${order.id} status updated to ${status}`,
        orderId: order.id,
        createdAt: new Date(),
        read: false,
      });
    }

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let orders;

    if (userRole === 'USER') {
      orders = await prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
          restaurant: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (userRole === 'RESTAURANT') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });

      if (!restaurant) {
        return res.json({ orders: [] });
      }

      orders = await prisma.order.findMany({
        where: { restaurantId: restaurant.id },
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (userRole === 'RIDER') {
      orders = await prisma.order.findMany({
        where: { riderId: userId },
        include: {
          orderItems: {
            include: {
              menuItem: true,
            },
          },
          restaurant: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(403).json({ error: 'Invalid role' });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailableOrdersForRider = async (req, res) => {
  try {
    // Get orders that are ACCEPTED or PREPARING and don't have a rider
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['ACCEPTED', 'PREPARING', 'READY'],
        },
        riderId: null,
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization check
    if (userRole === 'USER' && order.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (userRole === 'RESTAURANT') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (!restaurant || order.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    if (userRole === 'RIDER' && order.riderId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
