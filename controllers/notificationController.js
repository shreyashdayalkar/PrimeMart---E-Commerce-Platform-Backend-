import Notification from "../models/Notification.js";

/**
 * @desc    Fetch latest notifications for admin
 * @route   GET /api/notifications/admin
 * @access  Private (Admin)
 */
export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("orderId", "orderNumber totalAmount"); // Populate basic order info

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch notifications.",
    });
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (Admin)
 */
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() }, // Added readAt timestamp for better tracking
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update notification.",
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private (Admin)
 */
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true, readAt: new Date() });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update notifications.",
    });
  }
};

/**
 * ✅ NEW: Delete all notifications that have been read
 * @desc    Clear all read notifications from database
 * @route   DELETE /api/notifications/clear-read
 * @access  Private (Admin Only)
 */
export const clearReadNotifications = async (req, res) => {
  try {
    // Only target notifications where isRead is true
    const result = await Notification.deleteMany({ isRead: true });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} read notifications cleared.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to clear notifications.",
    });
  }
};