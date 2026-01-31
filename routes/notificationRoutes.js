import express from "express";
import {
  getAdminNotifications,
  markNotificationRead,
  markAllRead,
  clearReadNotifications, // ✅ Imported the new controller function
} from "../controllers/notificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Fetch latest 20 notifications for the admin dashboard
 * @access  Private (Admin)
 */
router.get(
  "/", 
  authMiddleware, 
  adminMiddleware, 
  getAdminNotifications
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all unread notifications as read
 * @access  Private (Admin)
 */
router.patch(
  "/read-all", 
  authMiddleware, 
  adminMiddleware, 
  markAllRead
);

/**
 * @route   DELETE /api/notifications/clear-read
 * @desc    Clear all read notifications from database
 * @access  Private (Admin)
 */
router.delete(
  "/clear-read", 
  authMiddleware, 
  adminMiddleware, 
  clearReadNotifications
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a specific notification as read by ID
 * @access  Private (Admin)
 */
router.patch(
  "/:id/read", 
  authMiddleware, 
  adminMiddleware, 
  markNotificationRead
);

export default router;