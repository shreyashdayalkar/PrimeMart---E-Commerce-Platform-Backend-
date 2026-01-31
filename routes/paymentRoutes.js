import express from 'express';
// ✅ Import names match the controller exports exactly
import { createCheckoutSession, verifyPayment } from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/payments/create-checkout-session
 * @desc    Initialize Stripe Checkout. 
 * Expects: { items, totalAmount, orderId } in req.body
 * @access  Private (authMiddleware required)
 */
router.post(
  '/create-checkout-session', 
  authMiddleware, 
  createCheckoutSession
);

/**
 * @route   POST /api/payments/verify-payment
 * @desc    Main endpoint to verify Stripe session status via POST body
 * Expects: { sessionId } or { session_id }
 * @access  Private
 */
router.post(
  '/verify-payment', 
  authMiddleware, 
  verifyPayment
);

/**
 * @route   GET /api/payments/stripe/verify
 * @desc    Verify Stripe session via Query Params (session_id)
 * Used by the Success Page after redirect (?session_id=cs_test...)
 * @access  Private
 */
router.get(
  '/stripe/verify', 
  authMiddleware, 
  verifyPayment
);

/**
 * @route   POST /api/payments/verify
 * @desc    Alias for backward compatibility with older frontend calls
 * @access  Private
 */
router.post(
  '/verify', 
  authMiddleware, 
  verifyPayment
);

export default router;