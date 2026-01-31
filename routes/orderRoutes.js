import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  deleteMyOrder,
  getOrderById,
  deleteOrder,
  getOrderInvoice,
  updateOrderStatus, // ✅ Added missing import
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/orders
 * @desc    Place a new order
 * @access  Private (User)
 */
router.post("/", authMiddleware, createOrder); 

/**
 * @route   GET /api/orders/my
 * @desc    Get logged in user orders
 * @access  Private (User)
 */
router.get("/my", authMiddleware, getMyOrders); 

/* ================= ADMIN ROUTES ================= */

/**
 * @route   GET /api/orders/all
 * @desc    Get all orders
 * @access  Private (Admin)
 */
router.get("/all", authMiddleware, adminMiddleware, getAllOrders);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Approve/Update order status and trigger invoice automation
 * @access  Private (Admin)
 */
router.patch("/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);

/**
 * @route   DELETE /api/orders/admin/:id
 * @desc    Permanently delete an order from database
 * @access  Private (Admin)
 */
router.delete("/admin/:id", authMiddleware, adminMiddleware, deleteOrder);

/* ================= PARAMETERIZED ROUTES ================= */

/**
 * @route   GET /api/orders/:id/invoice
 * @desc    Get order invoice URL
 * @access  Private (Authorized User/Admin)
 * ✅ Returns { invoiceUrl, invoiceNumber, orderNumber } via getOrderInvoice controller
 */
router.get("/:id/invoice", authMiddleware, getOrderInvoice);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order details
 * @access  Private (User/Admin)
 */
router.get("/:id", authMiddleware, getOrderById);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete a cancelled or rejected order from history
 * @access  Private (User)
 */
router.delete("/:id", authMiddleware, deleteMyOrder); 

export default router;