import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // ✅ TTL Index: Document auto-deletes when current time > expiresAt
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;