import express from "express";
import {
  getAllUsers,
  getAllProducts,
  getAllOrders,
  deleteUser,
  deleteProduct,
  updateUserRole,
  updateProduct,
  updateOrderStatus,
  getDashboardStats,
  // Approval Workflow Controllers
  getPendingOrders,
  approveOrder,
  rejectOrder
} from "../controllers/adminController.js";

import { createProduct } from "../controllers/ProductController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/upload.js"; 

const router = express.Router();

/**
 * 🔐 SECURITY MIDDLEWARE
 * All routes defined in this file require a valid JWT token
 * and the user must have the 'admin' role.
 */
router.use(authMiddleware);
router.use(adminMiddleware);

/* ================= USERS ================= */
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/role", updateUserRole);

/* ================= PRODUCTS ================= */
router.get("/products", getAllProducts);

// Create Product: Handles multipart/form-data for Cloudinary image upload
router.post("/products", upload.single("image"), createProduct);

router.delete("/products/:id", deleteProduct);

// Update Product: Handles multipart/form-data for Cloudinary image replacement
router.put("/products/:id", upload.single("image"), updateProduct);

/* ================= ORDERS ================= */
// General Order Management
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);

// ✅ Approval Workflow
router.get("/orders/pending", getPendingOrders);
router.patch("/orders/:id/approve", approveOrder);
router.patch("/orders/:id/reject", rejectOrder);

/* ================= DASHBOARD STATS ================= */
router.get("/stats", getDashboardStats);

export default router;