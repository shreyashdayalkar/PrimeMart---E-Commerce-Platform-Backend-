import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js"; // ✅ Imported for asset management

/* CREATE PRODUCT */
export const createProduct = async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: "Name, price, and category are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Product image is required" });
    }

    const newProduct = new Product({
      name,
      price,
      category,
      description,
      stock,
      image: {
        url: req.file.path,
        public_id: req.file.filename 
      }
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
};

/* UPDATE PRODUCT */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    let product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.file) {
      if (product.image && product.image.public_id) {
        await cloudinary.uploader.destroy(product.image.public_id);
      }

      req.body.image = {
        url: req.file.path,
        public_id: req.file.filename
      };
    } else {
      delete req.body.image;
    }

    product = await Product.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json(product);
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
};

/* DELETE PRODUCT */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch the product to access image metadata (public_id)
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2. ✅ Delete image from Cloudinary BEFORE deleting from MongoDB
    if (product.image && product.image.public_id) {
      await cloudinary.uploader.destroy(product.image.public_id);
    }

    // 3. Delete the product document from database
    await Product.findByIdAndDelete(id);

    res.status(200).json({ message: "Product and associated image deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
};