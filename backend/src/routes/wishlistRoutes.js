const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Wishlist = require("../models/Wishlist");

const router = express.Router();

// Add product to wishlist
router.post("/wishlist", async (req, res) => {
    try {
        const { userId, productId } = req.body;

        if (!userId || !productId) {
            return res.status(400).json({
                message: "userId and productId are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const existingItem = await Wishlist.findOne({
            userId,
            product: productId
        });

        if (existingItem) {
            return res.status(409).json({
                message: "Product already exists in wishlist"
            });
        }

        const wishlistItem = await Wishlist.create({
            userId,
            product: productId
        });

        const populatedItem = await wishlistItem.populate("product");

        res.status(201).json(populatedItem);
    } catch (error) {
        res.status(500).json({
            message: "Failed to add product to wishlist",
            error: error.message
        });
    }
});

// Get user's wishlist
router.get("/wishlist/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const wishlist = await Wishlist.find({
            userId
        })
            .populate("product")
            .sort({ createdAt: -1 });

        res.status(200).json({
            userId,
            totalItems: wishlist.length,
            wishlist
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch wishlist",
            error: error.message
        });
    }
});

// Remove product from wishlist
router.delete(
    "/wishlist/:userId/:productId",
    async (req, res) => {
        try {
            const { userId, productId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    message: "Invalid product ID"
                });
            }

            const deletedItem = await Wishlist.findOneAndDelete({
                userId,
                product: productId
            });

            if (!deletedItem) {
                return res.status(404).json({
                    message: "Wishlist item not found"
                });
            }

            res.status(200).json({
                message: "Product removed from wishlist",
                productId
            });
        } catch (error) {
            res.status(500).json({
                message: "Failed to remove product from wishlist",
                error: error.message
            });
        }
    }
);

module.exports = router;
