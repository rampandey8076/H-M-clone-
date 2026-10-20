const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Cart = require("../models/Cart");

const router = express.Router();


// ==========================================
// ADD PRODUCT TO CART
// ==========================================

router.post("/cart", async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;

        if (!userId || !productId || quantity === undefined) {
            return res.status(400).json({
                message: "userId, productId and quantity are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product.stock === 0) {
            return res.status(400).json({
                message: "Product is out of stock"
            });
        }

        const existingItem = await Cart.findOne({
            userId,
            product: productId
        });

        let cartItem;

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;

            if (newQuantity > product.stock) {
                return res.status(400).json({
                    message: `Only ${product.stock} items are available in stock`
                });
            }

            existingItem.quantity = newQuantity;
            cartItem = await existingItem.save();
        } else {
            if (quantity > product.stock) {
                return res.status(400).json({
                    message: `Only ${product.stock} items are available in stock`
                });
            }

            cartItem = await Cart.create({
                userId,
                product: productId,
                quantity
            });
        }

        const populatedItem = await cartItem.populate("product");

        res.status(201).json({
            message: "Product added to cart",
            cartItem: populatedItem
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to add product to cart",
            error: error.message
        });
    }
});


// ==========================================
// GET USER CART
// ==========================================

router.get("/cart/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const cart = await Cart.find({
            userId
        })
            .populate("product")
            .sort({ createdAt: -1 });

        let totalItems = 0;
        let subtotal = 0;

        const items = cart.map((item) => {
            const itemSubtotal = item.product.price * item.quantity;

            totalItems += item.quantity;
            subtotal += itemSubtotal;

            return {
                _id: item._id,
                product: item.product,
                quantity: item.quantity,
                itemSubtotal
            };
        });

        res.status(200).json({
            userId,
            totalItems,
            subtotal,
            items
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch cart",
            error: error.message
        });
    }
});


// ==========================================
// UPDATE CART QUANTITY
// ==========================================

router.patch("/cart/:userId/:productId", async (req, res) => {
    try {
        const { userId, productId } = req.params;
        const { quantity } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (quantity > product.stock) {
            return res.status(400).json({
                message: `Only ${product.stock} items are available in stock`
            });
        }

        const cartItem = await Cart.findOne({
            userId,
            product: productId
        });

        if (!cartItem) {
            return res.status(404).json({
                message: "Cart item not found"
            });
        }

        cartItem.quantity = quantity;

        await cartItem.save();

        const populatedItem = await cartItem.populate("product");

        res.status(200).json({
            message: "Cart quantity updated",
            cartItem: populatedItem
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update cart",
            error: error.message
        });
    }
});


// ==========================================
// REMOVE PRODUCT FROM CART
// ==========================================

router.delete("/cart/:userId/:productId", async (req, res) => {
    try {
        const { userId, productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const deletedItem = await Cart.findOneAndDelete({
            userId,
            product: productId
        });

        if (!deletedItem) {
            return res.status(404).json({
                message: "Cart item not found"
            });
        }

        res.status(200).json({
            message: "Product removed from cart",
            productId
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to remove product from cart",
            error: error.message
        });
    }
});


// ==========================================
// CLEAR USER CART
// ==========================================

router.delete("/cart/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await Cart.deleteMany({
            userId
        });

        res.status(200).json({
            message: "Cart cleared successfully",
            deletedItems: result.deletedCount
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to clear cart",
            error: error.message
        });
    }
});


module.exports = router;
