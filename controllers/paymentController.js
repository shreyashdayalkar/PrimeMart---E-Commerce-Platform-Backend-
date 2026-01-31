import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Counter from "../models/Counter.js";
import { generateInvoicePDF } from "../utils/pdfGenerator.js";
import { uploadInvoicePDF } from "../config/cloudinary.js";
import { sendInvoiceEmail } from "../utils/sendEmail.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Create Stripe Checkout Session
 * @route   POST /api/payments/create-checkout-session
 * @access  Private
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { items, totalAmount, orderId } = req.body;

    // ✅ VALIDATION: Ensure orderId is provided by the frontend
    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: "Order ID is required to initiate payment." 
      });
    }

    const userId = req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    // Prepare line items for Stripe
    const line_items = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.name,
          images: item.image ? [typeof item.image === 'string' ? item.image : item.image.url] : [],
        },
        unit_amount: Math.round(Number(item.price) * 100), // Stripe expects amounts in paise/cents
      },
      quantity: item.quantity || item.qty || 1,
    }));

    // ✅ SESSION CREATION: Added specific success/cancel URLs and metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      customer_email: req.user?.email,
      // Success URL with dynamic {CHECKOUT_SESSION_ID} template
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      // Cancel URL redirects user back to checkout or cart
      cancel_url: `${process.env.CLIENT_URL}/checkout`,
      // ✅ METADATA: Storing orderId here is crucial for verifyPayment logic
      metadata: {
        orderId: orderId.toString(), 
        userId: userId.toString(),
      },
    });

    // Save the Stripe Session ID to our local order record
    await Order.findByIdAndUpdate(orderId, { stripeSessionId: session.id });

    res.status(200).json({
      success: true,
      url: session.url, // Redirect frontend to this URL
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe Session Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Verify Stripe Payment, Update DB & Trigger Invoice
 * @route   GET/POST /api/payments/verify
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    // Flexible Session ID reading logic
    const sessionId = 
      req.query.session_id || 
      req.query.sessionId || 
      req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        message: "Session ID is required for verification." 
      });
    }

    // Retrieve session from Stripe to check status
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // ✅ RETRIEVING FROM METADATA: Linked to the orderId we sent during creation
      const orderId = session.metadata.orderId;

      /**
       * ✅ UPDATE ORDER IN DB
       * logic: paymentStatus="paid", isPaid=true, paidAt=now, status="processing"
       */
      let order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: "paid",
          isPaid: true,
          paidAt: new Date(),
          status: "processing",
          paymentIntentId: session.payment_intent,
        },
        { new: true }
      ).populate("user", "name email mobile shippingAddress");

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // 2. TRIGGER INVOICE WORKFLOW
      if (!order.invoiceUrl) {
        try {
          const invCounter = await Counter.findOneAndUpdate(
            { name: "invoice" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          const invoiceNumber = `INV-${String(invCounter.seq).padStart(4, "0")}`;

          const freshOrder = await Order.findById(order._id)
            .populate("user", "name email mobile shippingAddress")
            .lean();

          const pdfBuffer = await generateInvoicePDF({ ...freshOrder, invoiceNumber });
          const uploadResult = await uploadInvoicePDF(pdfBuffer, order._id);

          order = await Order.findByIdAndUpdate(
            order._id,
            {
              invoiceUrl: uploadResult.secure_url,
              invoicePublicId: uploadResult.public_id,
              invoiceNumber: invoiceNumber,
              invoiceGeneratedAt: new Date(),
            },
            { new: true }
          );

          if (order.user?.email) {
            await sendInvoiceEmail({
              to: order.user.email,
              subject: "Payment Confirmed - Order Receipt ✅",
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #eee;">
                  <h2 style="color: #10b981;">Payment Received!</h2>
                  <p>Hi ${order.user.name},</p>
                  <p>Your payment for order <b>${order.orderNumber}</b> has been successfully verified.</p>
                  <p><strong>Total Amount Paid:</strong> ₹${order.totalAmount}</p>
                  <p>Download Link: <a href="${order.invoiceUrl}">View PDF Invoice</a></p>
                  <hr />
                  <p>Best regards,<br />Store Team</p>
                </div>
              `,
              invoicePdfBuffer: pdfBuffer,
              filename: `${invoiceNumber}.pdf`,
            });
          }
        } catch (invoiceErr) {
          console.error("Post-Payment Invoice Error:", invoiceErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and order finalized successfully",
        order,
      });
    }

    res.status(400).json({ success: false, message: "Payment has not been completed." });
  } catch (error) {
    console.error("Verify Payment Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
};