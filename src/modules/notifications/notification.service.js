import Notification from './notification.model.js';

export const createNotification = async (data) => {
  const notification = new Notification(data);
  return await notification.save();
};

export const getNotificationsByUser = async (userId, limit = 50) => {
  return await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export const markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
};

export const markAllAsRead = async (userId) => {
  return await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
};
