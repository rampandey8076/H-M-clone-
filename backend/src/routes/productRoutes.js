const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// Create product
router.post("/", async (req, res) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({
            message: "Failed to create product",
            error: error.message
        });
    }
});

// Get all products with pagination and search
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";

        const skip = (page - 1) * limit;

        const filter = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: "i" } },
                      { category: { $regex: search, $options: "i" } }
                  ]
              }
            : {};

        const products = await Product.find(filter)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(filter);

        res.status(200).json({
            page,
            limit,
            totalProducts,
            products
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to get products",
            error: error.message
        });
    }
});

// Get product count
router.get("/count", async (req, res) => {
    try {
        const count = await Product.countDocuments();

        res.status(200).json({
            count
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to get product count",
            error: error.message
        });
    }
});

// Get one product
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get product",
            error: error.message
        });
    }
});

// Update product
router.put("/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({
            message: "Failed to update product",
            error: error.message
        });
    }
});

// Delete product
router.delete("/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json({
            message: "Product deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete product",
            error: error.message
        });
    }
});

module.exports = router;