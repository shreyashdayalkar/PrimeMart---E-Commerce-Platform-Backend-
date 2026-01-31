import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["order_placed", "order_approved", "order_rejected"],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Set to false to allow for system-wide or optional user alerts
    },
    // ✅ REQUIRED: Tracks if the notification has been seen
    isRead: {
      type: Boolean,
      default: false,
    },
    // ✅ REQUIRED: Records the exact time the notification was read
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Optional: Add index for faster queries on unread notifications per user
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;