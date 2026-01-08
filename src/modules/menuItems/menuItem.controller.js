import prisma from '../../config/postgres.js';

export const getMyMenuItems = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    // Get restaurant for this owner
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId },
      select: { id: true },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Get menu items
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ menuItems });
  } catch (error) {
    console.error('Get my menu items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, imageUrl, image, veg } = req.body;
    const ownerId = req.user.userId;

    // Get restaurant for this owner
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found. Please create your restaurant first.' });
    }

    // Support both imageUrl and image for backward compatibility
    const imageValue = imageUrl || image || '';

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        image: imageValue,
        veg: veg !== undefined ? veg : true,
        restaurantId: restaurant.id,
      },
    });

    res.status(201).json({
      message: 'Menu item created successfully',
      menuItem,
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    // Verify restaurant ownership
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!menuItem || menuItem.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await prisma.menuItem.delete({
      where: { id },
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image, veg, imageUrl } = req.body;
    const ownerId = req.user.userId;

    // Verify restaurant ownership
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Verify menu item belongs to restaurant
    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!menuItem || menuItem.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Support both imageUrl and image
    const imageValue = imageUrl || image;

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(imageValue !== undefined && { image: imageValue }),
        ...(veg !== undefined && { veg }),
      },
    });

    res.json({
      message: 'Menu item updated successfully',
      menuItem: updatedItem,
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
