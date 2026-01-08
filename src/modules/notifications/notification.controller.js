import { getNotificationsByUser, markAsRead, markAllAsRead } from './notification.service.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;

    const notifications = await getNotificationsByUser(userId, limit);

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await markAsRead(notificationId, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await markAllAsRead(userId);

    res.json({
      message: 'All notifications marked as read',
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
