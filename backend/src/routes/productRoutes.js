const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();

// Create product
router.post("/", async (req, res) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({
            message: "Failed to create product",
            error: error.message
        });
    }
});

// Get products with search, filters, sorting and pagination
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const category = req.query.category || "";
        const sort = req.query.sort || "";

        const minPrice =
            req.query.minPrice !== undefined
                ? Number(req.query.minPrice)
                : null;

        const maxPrice =
            req.query.maxPrice !== undefined
                ? Number(req.query.maxPrice)
                : null;

        // Validate pagination
        if (page < 1) {
            return res.status(400).json({
                message: "Page must be greater than 0"
            });
        }

        if (limit < 1 || limit > 50) {
            return res.status(400).json({
                message: "Limit must be between 1 and 50"
            });
        }

        // Validate prices
        if (
            (minPrice !== null && Number.isNaN(minPrice)) ||
            (maxPrice !== null && Number.isNaN(maxPrice))
        ) {
            return res.status(400).json({
                message: "minPrice and maxPrice must be valid numbers"
            });
        }

        if (minPrice !== null && minPrice < 0) {
            return res.status(400).json({
                message: "minPrice cannot be negative"
            });
        }

        if (maxPrice !== null && maxPrice < 0) {
            return res.status(400).json({
                message: "maxPrice cannot be negative"
            });
        }

        if (
            minPrice !== null &&
            maxPrice !== null &&
            minPrice > maxPrice
        ) {
            return res.status(400).json({
                message: "minPrice cannot be greater than maxPrice"
            });
        }

        const skip = (page - 1) * limit;

        const filter = {};

        // Search by name or category
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } }
            ];
        }

        // Category filter
        if (category) {
            filter.category = {
                $regex: `^${category}$`,
                $options: "i"
            };
        }

        // Price range filter
        if (minPrice !== null || maxPrice !== null) {
            filter.price = {};

            if (minPrice !== null) {
                filter.price.$gte = minPrice;
            }

            if (maxPrice !== null) {
                filter.price.$lte = maxPrice;
            }
        }

        // Price sorting
        let sortOption = {};

        if (sort === "price_asc") {
            sortOption.price = 1;
        } else if (sort === "price_desc") {
            sortOption.price = -1;
        } else if (sort !== "") {
            return res.status(400).json({
                message: "Invalid sort value. Use price_asc or price_desc"
            });
        }

        const totalProducts = await Product.countDocuments(filter);

        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            page,
            limit,
            totalProducts,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
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
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product = await Product.findById(id);

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
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product = await Product.findByIdAndUpdate(
            id,
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
        res.status(400).json({
            message: "Failed to update product",
            error: error.message
        });
    }
});

// Delete product
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product = await Product.findByIdAndDelete(id);

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
