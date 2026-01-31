import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import sendEmail from "../utils/sendEmail.js";

/* ================= OTP REGISTRATION FLOW ================= */

/**
 * @desc    Request OTP for registration
 * @route   POST /api/auth/register-request-otp
 */
export const registerRequestOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await Otp.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await sendEmail({
      to: email,
      subject: "Your Registration OTP - PrimeMart",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #2563eb;">Verify Your Email</h2>
          <p>Thank you for registering. Use the following OTP to complete your sign-up process. This code is valid for 5 minutes.</p>
          <div style="background: #f9f9f9; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({ message: "OTP sent to email successfully" });
  } catch (error) {
    console.error("OTP Request Error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/**
 * @desc    Step 2: Verify OTP
 */
export const registerVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(404).json({ message: "OTP not found. Please request a new one." });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    res.status(200).json({ message: "OTP verified successfully. You can proceed." });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
};

/**
 * @desc    Step 3: Final registration
 */
export const registerUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      otp,
      mobile,
      secondaryMobile,
      address,           
      shippingAddress,   
      dateOfBirth,
      gender 
    } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: "Name, email, password and OTP are required" });
    }

    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ BACKWARD COMPATIBILITY: Map old 'address' to 'shippingAddress' if new structure is missing
    const finalShippingAddress = {
      fullName: (shippingAddress?.fullName || address?.fullName || name).trim(),
      phone: (shippingAddress?.phone || address?.phone || mobile || "").trim(),
      street: (shippingAddress?.street || address?.street || "").trim(),
      city: (shippingAddress?.city || address?.city || "").trim(),
      state: (shippingAddress?.state || address?.state || "").trim(),
      pincode: (shippingAddress?.pincode || address?.pincode || "").trim(),
      country: (shippingAddress?.country || address?.country || "India").trim(),
    };

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      mobile: mobile || "",
      secondaryMobile: secondaryMobile || "",
      address: {
        street: address?.street || "",
        city: address?.city || "",
        state: address?.state || "",
        pincode: address?.pincode || "",
        country: address?.country || "India",
      },
      shippingAddress: finalShippingAddress, 
      dateOfBirth: dateOfBirth || null,
      gender: gender || "",
    });

    await Otp.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shippingAddress: user.shippingAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Final Register Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

/* ================= LOGIN ================= */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        secondaryMobile: user.secondaryMobile,
        address: user.address,
        shippingAddress: user.shippingAddress, 
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= PROFILE UPDATES ================= */

export const updateShippingAddress = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { fullName, phone, street, city, state, pincode, country } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          shippingAddress: {
            fullName: fullName?.trim() || "",
            phone: phone?.trim() || "",
            street: street?.trim() || "",
            city: city?.trim() || "",
            state: state?.trim() || "",
            pincode: pincode?.trim() || "",
            country: country?.trim() || "India",
          }
        }
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Shipping address updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        shippingAddress: updatedUser.shippingAddress
      }
    });
  } catch (error) {
    console.error("Update Address Error:", error);
    res.status(500).json({ message: "Server error while updating address" });
  }
};

/* ================= GET ALL USERS (ADMIN) ================= */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
};