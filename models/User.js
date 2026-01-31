import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
    },

    secondaryMobile: {
      type: String,
      trim: true,
      default: "",
    },

    // Kept for backward compatibility
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "India" },
    },

    // ✅ Enhanced shippingAddress field for permanent storage
    shippingAddress: {
      fullName: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      street: {
        type: String,
        trim: true,
        default: "",
      },
      city: {
        type: String,
        trim: true,
        default: "",
      },
      state: {
        type: String,
        trim: true,
        default: "", // ✅ Added state field per requirements
      },
      pincode: {
        type: String,
        trim: true,
        default: "",
      },
      country: {
        type: String,
        trim: true,
        default: "India",
      },
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say", ""],
      default: "",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Ensure the sub-objects are returned even if empty when converting to JSON
// This is crucial so the frontend receives an object with keys even if they are empty strings
userSchema.set('toJSON', { minimize: false });
userSchema.set('toObject', { minimize: false });

export default mongoose.model("User", userSchema);