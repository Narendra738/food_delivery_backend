import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['USER', 'RESTAURANT', 'RIDER', 'ADMIN'],
      required: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ orderId: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
