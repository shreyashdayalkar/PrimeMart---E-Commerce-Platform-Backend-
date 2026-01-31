import express from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  registerRequestOtp,
  registerVerifyOtp,
  updateShippingAddress, // ✅ Import the new controller
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

/* ================= AUTH ================= */

// 1. Request OTP (Sends email)
router.post("/register-request-otp", registerRequestOtp);

// 2. Verify OTP only (Checks if OTP is valid for the email)
router.post("/register-verify-otp", registerVerifyOtp);

// 3. Final Registration (Creates the user document)
router.post("/register", registerUser);

// 4. Login
router.post("/login", loginUser);

/* ================= USER PROFILE ================= */

// ✅ Update Shipping Address
router.patch("/shipping-address", authMiddleware, updateShippingAddress);

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Profile OK",
    user: req.user,
  });
});

/* ================= ADMIN ================= */
router.get(
  "/admin",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    res.json({
      message: "Admin OK",
    });
  }
);

/* ================= ADMIN – GET ALL USERS ================= */
router.get(
  "/users",
  authMiddleware,
  adminMiddleware,
  getAllUsers
);

export default router;