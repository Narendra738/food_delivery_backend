import prisma from '../../config/postgres.js';

export const updateProfile = async (req, res) => {
    try {
        const { name, image } = req.body;
        const userId = req.user.userId;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                image,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                createdAt: true,
            },
        });

        res.json({
            message: 'Profile updated successfully',
            user,
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
