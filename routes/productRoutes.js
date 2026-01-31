import express from "express";
import Product from "../models/Product.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import upload from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js"; // Needed for potential cleanup logic

const router = express.Router();

/* 🌐 PUBLIC: Get all products */
router.get("/", async (req, res) => {
  try {
    // Returns all fields including image: { url, public_id }
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

/* 🌐 PUBLIC: Get single product */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    // Returns the full product document with image object
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

/* 🔐 ADMIN: CREATE product (Cloudinary image) */
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Product image is required" });
      }

      const product = new Product({
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        category: req.body.category,
        stock: req.body.stock,
        image: {
          url: req.file.path,          // 🔥 Cloudinary URL
          public_id: req.file.filename // 🔥 Cloudinary ID
        },
      });

      const savedProduct = await product.save();
      res.status(201).json(savedProduct);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create product" });
    }
  }
);

/* 🔐 ADMIN: UPDATE product (optional image) */
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Update basic fields
      product.name = req.body.name || product.name;
      product.price = req.body.price || product.price;
      product.description = req.body.description || product.description;
      product.category = req.body.category || product.category;
      product.stock = req.body.stock || product.stock;

      // 🔥 Update image and cleanup old asset if new file provided
      if (req.file) {
        // Delete old image from Cloudinary
        if (product.image && product.image.public_id) {
          await cloudinary.uploader.destroy(product.image.public_id);
        }

        product.image = {
          url: req.file.path,
          public_id: req.file.filename,
        };
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  }
);

/* 🔐 ADMIN: DELETE product */
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Cleanup: Delete from Cloudinary before removing from DB
    if (product.image && product.image.public_id) {
      await cloudinary.uploader.destroy(product.image.public_id);
    }

    await product.deleteOne();
    res.json({ message: "Product and associated image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product" });
  }
});

export default router;