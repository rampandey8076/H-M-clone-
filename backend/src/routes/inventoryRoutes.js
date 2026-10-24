const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/inventory/summary
router.get("/inventory/summary", async (req, res) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: "$stock" },
                    outOfStock: {
                        $sum: {
                            $cond: [{ $eq: ["$stock", 0] }, 1, 0]
                        }
                    },
                    inventoryValue: {
                        $sum: { $multiply: ["$price", "$stock"] }
                    }
                }
            }
        ]);

        res.status(200).json(
            summary[0] || {
                totalProducts: 0,
                totalStock: 0,
                outOfStock: 0,
                inventoryValue: 0
            }
        );
    } catch (error) {
        res.status(500).json({
            message: "Failed to generate inventory summary",
            error: error.message
        });
    }
});

// GET /api/inventory/low-stock?threshold=5
router.get("/inventory/low-stock", async (req, res) => {
    try {
        const threshold = Number(req.query.threshold ?? 5);

        if (!Number.isInteger(threshold) || threshold < 0) {
            return res.status(400).json({
                message: "threshold must be a non-negative integer"
            });
        }

        const products = await Product.find({
            stock: { $lte: threshold }
        }).sort({ stock: 1 });

        res.status(200).json({
            threshold,
            total: products.length,
            products
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch low-stock products",
            error: error.message
        });
    }
});

// PATCH /api/inventory/:productId/stock
// Body: { "quantity": 10, "operation": "add" }
// operation can be "add", "subtract", or "set"
router.patch("/inventory/:productId/stock", async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity, operation } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return res.status(400).json({
                message: "quantity must be a non-negative integer"
            });
        }

        if (!["add", "subtract", "set"].includes(operation)) {
            return res.status(400).json({
                message: "operation must be add, subtract, or set"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        let newStock;

        if (operation === "add") {
            newStock = product.stock + quantity;
        } else if (operation === "subtract") {
            newStock = product.stock - quantity;
        } else {
            newStock = quantity;
        }

        if (newStock < 0) {
            return res.status(400).json({
                message: "Insufficient stock for this adjustment",
                currentStock: product.stock
            });
        }

        product.stock = newStock;
        await product.save();

        res.status(200).json({
            message: "Inventory updated successfully",
            productId: product._id,
            name: product.name,
            previousStock: operation === "set"
                ? null
                : operation === "add"
                    ? newStock - quantity
                    : newStock + quantity,
            stock: product.stock,
            operation
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update inventory",
            error: error.message
        });
    }
});

module.exports = router;
