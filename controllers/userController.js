import User from "../models/User.js";

/**
 * @desc    Get current user profile (Latest data from DB)
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getMyProfile = async (req, res) => {
  try {
    // Standardize userId retrieval from auth middleware
    const userId = req.user._id || req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User session not found.",
      });
    }

    // Fetch fresh data from DB to ensure frontend has the latest shipping info
    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        secondaryMobile: user.secondaryMobile,
        address: user.address,           // General address
        shippingAddress: user.shippingAddress, // ✅ Specific delivery address
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile.",
    });
  }
};

/**
 * @desc    Update logged-in user shipping address
 * @route   PATCH /api/users/shipping-address
 * @access  Private
 */
export const updateShippingAddress = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;

    const { 
      fullName, 
      phone, 
      street, 
      city, 
      state, 
      pincode, 
      country 
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Sync logic: Updates shippingAddress with fallbacks to avoid 'undefined'
    user.shippingAddress = {
      fullName: (fullName || user.shippingAddress?.fullName || user.name || "").trim(),
      phone: (phone || user.shippingAddress?.phone || user.mobile || "").trim(),
      street: (street || user.shippingAddress?.street || "").trim(),
      city: (city || user.shippingAddress?.city || "").trim(),
      state: (state || user.shippingAddress?.state || "").trim(),
      pincode: (pincode || user.shippingAddress?.pincode || "").trim(),
      country: (country || user.shippingAddress?.country || "India").trim(),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Shipping address updated successfully",
      user: {
        id: user._id,
        name: user.name,
        shippingAddress: user.shippingAddress,
      },
    });
  } catch (error) {
    console.error("UPDATE SHIPPING ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update shipping address.",
    });
  }
};