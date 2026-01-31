import jwt from "jsonwebtoken";
import Order from "../models/Order.js"; // ✅ Needed to verify order ownership

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Not authorized, token missing",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

/**
 * ✅ Helper Middleware: canAccessOrderInvoice
 * Ensures only the order owner or an admin can access the resource.
 */
export const canAccessOrderInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;
    const userRole = req.user.role;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Authorization Logic: Admin OR Owner
    const isAdmin = userRole === "admin";
    const isOwner = order.user.toString() === userId.toString();

    if (isAdmin || isOwner) {
      // ✅ Optional: Attach order to req to avoid re-fetching in controller
      req.order = order;
      return next();
    }

    return res.status(403).json({ 
      message: "Access denied. You do not have permission to view this invoice." 
    });
  } catch (error) {
    console.error("canAccessOrderInvoice Error:", error.message);
    res.status(500).json({ message: "Server error during authorization" });
  }
};

export default authMiddleware;