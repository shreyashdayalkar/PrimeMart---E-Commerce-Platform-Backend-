import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import connectDB from "../config/db.js";

dotenv.config();

const admins = [
  {
    name: "Shreyash Dayalkar",
    email: process.env.ADMIN_EMAIL || "admin@shop.com",
    password: process.env.ADMIN_PASSWORD || "admin123",
  },
  {
    name: "Vedant Dayalkar",
    email: process.env.ADMIN2_EMAIL || "admin2@shop.com",
    password: process.env.ADMIN2_PASSWORD || "admin123",
  },
];

const seedAdmin = async () => {
  try {
    console.log("🚀 Starting admin creation...");

    await connectDB();

    for (const admin of admins) {
      const existing = await User.findOne({ email: admin.email });

      if (existing) {
        console.log("⚠️ Admin already exists:", admin.email);
        continue;
      }

      const hashedPassword = await bcrypt.hash(admin.password, 10);

      await User.create({
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        role: "admin",
        accountStatus: "active",
      });

      //console.log("✅ Admin created:", admin.email);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
