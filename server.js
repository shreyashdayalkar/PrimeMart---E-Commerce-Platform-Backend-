import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";

// Routes
import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const app = express();

/* ✅ CONNECT DATABASE */
connectDB();

/* ✅ CORS (FRONTEND + LOCALHOST ALLOWED) */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://prime-mart-e-commerce-platform.vercel.app" // 👈 FRONTEND URL
    ],
    credentials: true,
  })
);

/* ✅ BODY PARSERS */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ✅ ROUTES */
app.use("/api/admin/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);

/* ✅ HEALTH CHECK */
app.get("/", (req, res) => {
  res.send("✅ PrimeMart Backend is running on Vercel");
});

/* ✅ ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ message: "Server error" });
});

/* ✅ REQUIRED FOR VERCEL */
export default app;