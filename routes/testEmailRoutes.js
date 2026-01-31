import express from "express";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

// POST /api/test-email
router.post("/test-email", async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ message: "Receiver email (to) is required" });
    }

    await sendEmail({
      to,
      subject: "✅ Nodemailer Test Success",
      html: "<h2>Congrats! Nodemailer is working 🎉</h2>",
    });

    res.json({ success: true, message: "Test email sent successfully" });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
