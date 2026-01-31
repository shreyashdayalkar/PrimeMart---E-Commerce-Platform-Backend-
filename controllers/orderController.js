import Order from "../models/Order.js";
import Counter from "../models/Counter.js";
import Product from "../models/Product.js";
import User from "../models/User.js"; 
import { sendInvoiceEmail } from "../utils/sendEmail.js"; 
import Notification from "../models/Notification.js";
import { generateInvoicePDF } from "../utils/pdfGenerator.js"; 
import { uploadInvoicePDF } from "../config/cloudinary.js"; 

/* ================= CREATE ORDER (USER) ================= */
export const createOrder = async (req, res) => {
  try {
    const { 
      items, 
      orderItems, 
      totalAmount, 
      totalPrice, 
      shippingAddress, 
      address, 
      paymentMethod,
      tax 
    } = req.body;

    const finalItems = orderItems || items;
    const finalAddress = shippingAddress || address;
    const finalTotal = totalAmount || totalPrice;

    if (!req.user || (!req.user._id && !req.user.userId)) {
      return res.status(401).json({ message: "User session not found. Please log in again." });
    }

    const userId = req.user._id || req.user.userId;

    // ✅ Always fetch latest user from DB for robust fallback data
    const userDoc = await User.findById(userId).select("name email mobile shippingAddress");
    if (!userDoc) {
      return res.status(404).json({ message: "User profile not found." });
    }

    if (!finalItems || !Array.isArray(finalItems) || finalItems.length === 0) {
      return res.status(400).json({ message: "Order cannot be created: No items provided." });
    }

    /* 🔥 Atomic Counter for Serial Order Numbers */
    const counter = await Counter.findOneAndUpdate(
      { name: "order" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const orderNumber = `ORD-${String(counter.seq).padStart(4, "0")}`;

    /* ✅ Format items with Data Mapping & Product Fallback Fetch */
    const formattedItems = await Promise.all(finalItems.map(async (item) => {
      const productId = item.productId || item.product || item._id;
      
      if (!item.name || !item.price) {
        const dbProduct = await Product.findById(productId);
        if (dbProduct) {
          return {
            productId,
            name: dbProduct.name,
            price: dbProduct.price,
            quantity: item.quantity || item.qty || 1,
            image: dbProduct.image?.url || dbProduct.image || "",
          };
        }
      }

      return {
        productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity || item.qty || 1,
        image: typeof item.image === 'object' ? item.image.url : (item.image || ""),
      };
    }));

    const isStripe = paymentMethod?.toLowerCase() === "stripe" || paymentMethod === "Online";
    
    // ✅ ROBUST AUTO-FILL LOGIC
    const customerFullName = (
      finalAddress?.fullName ||
      userDoc?.shippingAddress?.fullName ||
      userDoc?.name ||
      "Customer"
    ).trim();

    const customerPhone = (
      finalAddress?.phone ||
      userDoc?.shippingAddress?.phone ||
      userDoc?.mobile ||
      "N/A"
    ).toString().trim();

    const orderData = {
      user: userId,
      items: formattedItems,
      totalAmount: finalTotal,
      tax: tax || 0,
      shippingAddress: {
        street: finalAddress?.street || userDoc?.shippingAddress?.street || "",
        city: finalAddress?.city || userDoc?.shippingAddress?.city || "",
        pincode: finalAddress?.pincode || userDoc?.shippingAddress?.pincode || "",
        state: finalAddress?.state || userDoc?.shippingAddress?.state || "",
        country: finalAddress?.country || userDoc?.shippingAddress?.country || "India",
        fullName: customerFullName,
        phone: customerPhone,
      },
      paymentMethod: isStripe ? "stripe" : "cod",
      orderNumber,
      status: "pending", 
      isPaid: false, 
      paymentStatus: "pending"
    };

    let order = await Order.create(orderData);

    /* ================= ✅ INVOICE & EMAIL WORKFLOW ================= */
    let invoiceUrl = "";
    try {
      const invCounter = await Counter.findOneAndUpdate(
        { name: "invoice" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const invoiceNumber = `INV-${String(invCounter.seq).padStart(4, "0")}`;

      // REFRESH order with populated user before generating invoice PDF
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
      
      invoiceUrl = uploadResult.secure_url;

      let recipientEmail = userDoc.email;
      if (recipientEmail) {
        const subject = isStripe ? "Order Received - Awaiting Payment ⏳" : "Order Placed Successfully ✅";
        await sendInvoiceEmail({
          to: recipientEmail,
          subject,
          html: `<p>Thank you for your order (<b>${orderNumber}</b>). Your invoice is attached.</p>`,
          invoicePdfBuffer: pdfBuffer,
          filename: `${invoiceNumber}.pdf`
        });
      }
    } catch (workflowError) {
      console.error("Non-critical Workflow Error (Invoice/Email):", workflowError.message);
    }

    try {
      await Notification.create({
        type: "order_placed",
        title: isStripe ? "New Online Order (Pending)" : "New COD Order Received",
        message: `Order ${orderNumber} placed for ₹${finalTotal}.`,
        orderId: order._id,
        userId: userId,
      });
    } catch (notifError) {
      console.error("Notification Error:", notifError.message);
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
      invoiceUrl
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET ORDER INVOICE (USER/ADMIN) ================= */
export const getOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;
    const userRole = req.user.role;

    const order = await Order.findById(id).populate("user", "name email mobile shippingAddress");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isOwner = order.user?._id.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to access this invoice" });
    }

    if (order.invoiceUrl) {
      return res.json({
        success: true,
        invoiceUrl: order.invoiceUrl,
        invoiceNumber: order.invoiceNumber,
        orderNumber: order.orderNumber
      });
    }

    const invCounter = await Counter.findOneAndUpdate(
      { name: "invoice" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const invoiceNumber = `INV-${String(invCounter.seq).padStart(4, "0")}`;

    const freshOrder = await Order.findById(id)
      .populate("user", "name email mobile shippingAddress")
      .lean();

    const pdfBuffer = await generateInvoicePDF({ ...freshOrder, invoiceNumber });
    const uploadResult = await uploadInvoicePDF(pdfBuffer, order._id);

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        invoiceUrl: uploadResult.secure_url,
        invoicePublicId: uploadResult.public_id,
        invoiceNumber: invoiceNumber,
        invoiceGeneratedAt: new Date(),
      },
      { new: true }
    );

    res.json({
      success: true,
      invoiceUrl: updatedOrder.invoiceUrl,
      invoiceNumber: updatedOrder.invoiceNumber,
      orderNumber: updatedOrder.orderNumber
    });
  } catch (error) {
    console.error("GET ORDER INVOICE ERROR:", error);
    res.status(500).json({ message: "Failed to process invoice", error: error.message });
  }
};

/* ================= GET MY ORDERS (USER) ================= */
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .select("-__v");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET ALL ORDERS (ADMIN) ================= */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .select("-__v");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET SINGLE ORDER (USER/ADMIN) ================= */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email mobile role shippingAddress")
      .populate("items.productId", "name price image");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const userId = req.user._id || req.user.userId;
    const isAdmin = req.user.role === "admin";
    const isOwner = order.user?._id.toString() === userId.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= UPDATE ORDER STATUS (ADMIN APPROVAL & REJECTION) ================= */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "rejected"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData = { status };
    if (status === "rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    let order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("user", "email name mobile shippingAddress"); 

    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ CASE A: REJECTION
    if (status === "rejected") {
      try {
        if (order.user?.email) {
          await sendInvoiceEmail({
            to: order.user.email,
            subject: `Order Rejected: ${order.orderNumber} ❌`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #fee2e2;">
                <h2 style="color: #dc2626;">Order Status: Rejected</h2>
                <p>Hi ${order.user.name},</p>
                <p>Regrettably, your order <b>${order.orderNumber}</b> has been rejected.</p>
                <p><strong>Reason:</strong> ${rejectionReason || "No specific reason provided."}</p>
                <p>Please contact our support for more info.</p>
              </div>
            `
          });
        }
      } catch (e) { console.error("Rejection Email Error:", e.message); }
    } 
    // ✅ CASE B: APPROVAL / DELIVERY (Invoice Automation)
    else if (status === "processing" || status === "delivered") {
      try {
        let pdfBuffer;
        let invoiceNumber = order.invoiceNumber;
        let invoiceUrl = order.invoiceUrl;

        if (!order.invoiceUrl) {
          const invCounter = await Counter.findOneAndUpdate(
            { name: "invoice" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          invoiceNumber = `INV-${String(invCounter.seq).padStart(4, "0")}`;

          const freshOrder = await Order.findById(order._id)
            .populate("user", "name email mobile shippingAddress")
            .lean();

          pdfBuffer = await generateInvoicePDF({ ...freshOrder, invoiceNumber });
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
          ).populate("user", "email name");

          invoiceUrl = uploadResult.secure_url;
        } else {
          const freshOrder = await Order.findById(order._id)
            .populate("user", "name email mobile shippingAddress")
            .lean();
          pdfBuffer = await generateInvoicePDF({ ...freshOrder, invoiceNumber });
        }

        if (order.user?.email) {
          await sendInvoiceEmail({
            to: order.user.email,
            subject: `Order Update: ${status.toUpperCase()} - Invoice Attached`,
            html: `<p>Your order <b>${order.orderNumber}</b> is now <b>${status}</b>. Tax Invoice attached.</p>`,
            invoicePdfBuffer: pdfBuffer,
            filename: `${invoiceNumber}.pdf`
          });
        }
      } catch (invErr) { console.error("Invoice Automation Error:", invErr.message); }
    } else {
      // General status update email (Shipped, Cancelled etc)
      try {
        if (order.user?.email) {
          await sendInvoiceEmail({
            to: order.user.email,
            subject: `Order Update: ${status.toUpperCase()}`,
            html: `<p>Your order <strong>${order.orderNumber}</strong> status is now <strong>${status}</strong>.</p>`
          });
        }
      } catch (e) { console.error("Update Email Error:", e.message); }
    }

    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= DELETE ORDER (ADMIN) ================= */
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted", orderNumber: order.orderNumber });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= DELETE MY ORDER (USER) ================= */
export const deleteMyOrder = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const order = await Order.findOne({ _id: req.params.id, user: userId });

    if (!order) return res.status(404).json({ message: "Order not found" });
    
    if (!["cancelled", "rejected"].includes(order.status)) {
      return res.status(400).json({ message: "Only cancelled/rejected orders can be deleted" });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Order removed from history" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ================= GET ORDER STATS (ADMIN) ================= */
export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });
    const totalRevenue = await Order.aggregate([
      { $match: { isPaid: true } }, 
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};