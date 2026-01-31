import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js"; // ✅ Added Notification import
import sendEmail from "../utils/sendEmail.js"; // ✅ Added sendEmail import

/* ================= USERS ================= */

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ message: "Failed to fetch user details" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, mobile, role, accountStatus } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;
    if (role) user.role = role;
    if (accountStatus) user.accountStatus = accountStatus;

    await user.save();
    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        accountStatus: user.accountStatus,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to update user" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!role || !["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Valid role (admin/user) required" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save();

    const updatedUser = await User.findById(id).select("-password");
    res.json({ message: "User role updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete user" });
  }
};

/* ================= PRODUCTS ================= */

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, image, stock, category } = req.body;

    if (!name || price === undefined || price === null || Number(price) <= 0) {
      return res.status(400).json({ message: "Name and valid price required" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.name = name;
    product.price = Number(price);
    if (description !== undefined) product.description = description;
    if (stock !== undefined) product.stock = Number(stock);
    if (category !== undefined) product.category = category;

    const existingPublicId = product.image?.public_id;

    if (image !== undefined) {
      if (!existingPublicId && !(typeof image === "object" && image?.public_id)) {
        return res.status(400).json({ message: "Existing image public_id missing. Please re-upload image." });
      }

      if (typeof image === "object" && image !== null) {
        if (!image.url) return res.status(400).json({ message: "Image URL is required" });
        product.image = { url: image.url, public_id: image.public_id ?? existingPublicId };
      } else if (typeof image === "string" && image.trim() !== "") {
        product.image = { url: image.trim(), public_id: existingPublicId };
      } else {
        return res.status(400).json({ message: "Invalid image format" });
      }
    }

    await product.save();
    return res.json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product" });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { name, price, description, stock, category } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ message: "Name, price, and category are required" });
    }
    if (!req.file) return res.status(400).json({ message: "Image is required" });

    const product = await Product.create({
      name,
      price: Number(price),
      description,
      category,
      stock: Number(stock) || 0,
      image: { url: req.file.path, public_id: req.file.filename },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ message: "Failed to add product" });
  }
};

/* ================= ORDERS ================= */

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "name email mobile role address");
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await Order.find({ status: "pending" })
      .populate("user", "name email mobile")
      .sort({ createdAt: -1 });
    res.json(pendingOrders);
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({ message: "Failed to fetch pending orders" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status provided" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status.toLowerCase();
    await order.save();

    const updatedOrder = await Order.findById(id).populate("user", "name email mobile role address");
    res.json({ message: "Order status updated successfully", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

/* ================= APPROVAL WORKFLOW ================= */

/**
 * Handles Admin Approval of a Pending Order
 */
export const approveOrder = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const order = await Order.findById(req.params.id).populate("user", "name email mobile");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 1. Update order status and tracking details
    order.status = "processing"; // ✅ Consistent approved state
    order.approvedBy = req.user._id || req.user.userId;
    order.approvedAt = new Date();
    order.rejectedBy = null;
    order.rejectedAt = null;

    await order.save();

    // 2. Create Notification for Admin/System
    try {
      await Notification.create({
        type: "order_approved",
        title: "Order Approved",
        message: `Order ${order.orderNumber} has been approved and is now processing.`,
        orderId: order._id,
        userId: order.user?._id
      });
    } catch (notifErr) {
      console.error("Notification Error:", notifErr.message);
    }

    // 3. Send Nodemailer Email to the User
    try {
      if (order.user?.email) {
        await sendEmail({
          to: order.user.email,
          subject: "Order Approved ✅",
          html: `
            <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
              <h2>Great news! Your order is approved.</h2>
              <p>Hi ${order.user.name},</p>
              <p>Your order <strong>${order.orderNumber}</strong> has been approved by our team and is now being processed.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #eee;"><strong>Status:</strong></td>
                  <td style="padding: 8px; border: 1px solid #eee;">Processing</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #eee;"><strong>Total Amount:</strong></td>
                  <td style="padding: 8px; border: 1px solid #eee;">₹${order.totalAmount}</td>
                </tr>
              </table>
              <p>We will notify you once your order is shipped.</p>
              <p>Thank you for shopping with us!</p>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.error("Email Error:", emailErr.message);
    }

    res.json({ message: "Order approved successfully", order });
  } catch (error) {
    console.error("Approve order error:", error);
    res.status(500).json({ message: "Failed to approve order" });
  }
};

/**
 * Handles Admin Rejection of a Pending Order
 */
export const rejectOrder = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const order = await Order.findById(req.params.id).populate("user", "name email mobile");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "rejected";
    order.rejectedBy = req.user._id || req.user.userId;
    order.rejectedAt = new Date();
    order.approvedBy = null;
    order.approvedAt = null;

    await order.save();

    // ✅ Added Notification for Rejection
    try {
      await Notification.create({
        type: "order_rejected",
        title: "Order Rejected",
        message: `Order ${order.orderNumber} was rejected by admin.`,
        orderId: order._id,
        userId: order.user?._id
      });
    } catch (notifErr) {
      console.error("Notification Error:", notifErr.message);
    }

    res.json({ message: "Order rejected successfully", order });
  } catch (error) {
    console.error("Reject order error:", error);
    res.status(500).json({ message: "Failed to reject order" });
  }
};

/* ================= DASHBOARD STATS ================= */

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const deliveredOrders = await Order.find({ status: "delivered" });
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email");

    const orderStatusCounts = {
      pending: await Order.countDocuments({ status: "pending" }),
      processing: await Order.countDocuments({ status: "processing" }),
      shipped: await Order.countDocuments({ status: "shipped" }),
      delivered: await Order.countDocuments({ status: "delivered" }),
      cancelled: await Order.countDocuments({ status: "cancelled" }),
    };

    const lowStockProducts = await Product.find({ stock: { $lt: 10 } }).limit(5);

    res.json({
      summary: { totalUsers, totalProducts, totalOrders, totalRevenue },
      orderStatus: orderStatusCounts,
      recentOrders,
      lowStockProducts,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard statistics" });
  }
};