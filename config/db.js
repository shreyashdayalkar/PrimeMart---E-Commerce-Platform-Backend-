import mongoose from "mongoose";

let isConnected = false; // global cache for serverless

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    // ❌ DO NOT exit process on Vercel
    throw error;
  }
};

export default connectDB;
