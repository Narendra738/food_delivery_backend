import prisma from '../../config/postgres.js';

export const createRestaurant = async (req, res) => {
  try {
    const { name, cuisine, banner } = req.body;
    const ownerId = req.user.userId;

    // Check if restaurant already exists for this owner
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { ownerId },
    });

    if (existingRestaurant) {
      return res.status(400).json({ error: 'Restaurant already exists for this owner' });
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        cuisine,
        banner,
        ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant,
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRestaurant = async (req, res) => {
  try {
    const { name, cuisine, banner } = req.body;
    const ownerId = req.user.userId;

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { ownerId },
      data: {
        ...(name && { name }),
        ...(cuisine && { cuisine }),
        ...(banner !== undefined && { banner }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      message: 'Restaurant updated successfully',
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyRestaurant = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId },
      include: {
        menuItems: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        menuItems: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ restaurants });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        menuItems: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRestaurantMenu = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Get menu items
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ menuItems });
  } catch (error) {
    console.error('Get restaurant menu error:', error);
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

export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image, veg } = req.body;
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

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(image !== undefined && { image }),
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
