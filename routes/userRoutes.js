import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getMyProfile,
  updateShippingAddress,
} from "../controllers/userController.js";

const router = express.Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current logged-in user's profile data (including shippingAddress)
 * @access  Private
 */
router.get("/me", authMiddleware, getMyProfile);

/**
 * @route   PATCH /api/users/shipping-address
 * @desc    Update logged-in user's shipping address
 * @access  Private
 */
router.patch("/shipping-address", authMiddleware, updateShippingAddress);

export default router;