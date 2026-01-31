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
import paymentRoutes from "./routes/paymentRoutes.js"; // ✅ Payment routes imported

const app = express();

/* ✅ DB */
connectDB();

/* ✅ MIDDLEWARE */
app.use(
  cors({
    origin: true, // ✅ allows current frontend origin automatically
    credentials: true,
  })
);

// ✅ Middleware enabled before routes to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ✅ ROUTES */
// ✅ IMPORTANT: notificationRoutes must come before "/api/admin" to avoid route conflict
app.use("/api/admin/notifications", notificationRoutes); 
app.use("/api/admin", adminRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);

// ✅ MOUNTING PAYMENT ROUTES
// This makes /api/payments/verify-payment reachable
app.use("/api/payments", paymentRoutes); 

/* ✅ TEST */
app.get("/", (req, res) => {
  res.send("✅ Server + DB + Auth + Orders + Notifications + Users + Payments OK");
});

/* ✅ ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});