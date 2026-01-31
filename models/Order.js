import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      default: () => `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        image: { type: String, required: true },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: [1, "Total amount must be at least 1"],
    },
    shippingAddress: {
      fullName: String, 
      phone: String,    
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "stripe", "COD", "Card", "UPI", "Net Banking"],
      default: "cod",
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      // ✅ Added "paid" to match your controller logic
      enum: ["pending", "completed", "failed", "paid"],
      default: "pending",
    },
    
    /* ✅ Stripe tracking fields */
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String }, // ✅ Specific field for Payment Intent
    paymentIntentId: { type: String },       // Keeping your alias for compatibility

    /* ✅ INVOICE FIELDS */
    invoiceNumber: {
      type: String,
      default: ""
    },
    invoiceUrl: { 
      type: String, 
      default: "" 
    },
    invoicePublicId: { 
      type: String, 
      default: "" 
    },
    invoiceGeneratedAt: { 
      type: Date, 
      default: null 
    },

    /* Admin Workflow Fields */
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    
    // ✅ REJECTION LOGIC FIELDS
    rejectionReason: { 
      type: String, 
      default: '' 
    },
    rejectedAt: { 
      type: Date, 
      default: null 
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);