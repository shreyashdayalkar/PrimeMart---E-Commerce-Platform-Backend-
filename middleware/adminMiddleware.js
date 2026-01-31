/**
 * @desc    Middleware to restrict access to Admin users only
 * @requirement Must be used AFTER authMiddleware
 */
const adminMiddleware = (req, res, next) => {
  // Check if user object exists and role is admin
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
};

export default adminMiddleware;