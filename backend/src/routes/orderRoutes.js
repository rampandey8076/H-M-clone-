const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Order = require("../models/Order");

const router = express.Router();


// ==========================================
// CREATE ORDER FROM CART
// ==========================================

router.post("/orders", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "userId is required"
            });
        }

        const cartItems = await Cart.find({ userId }).populate("product");

        if (cartItems.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        const orderItems = [];
        let totalAmount = 0;

        for (const cartItem of cartItems) {
            const product = cartItem.product;

            if (!product) {
                return res.status(404).json({
                    message: "A product in the cart no longer exists"
                });
            }

            if (cartItem.quantity > product.stock) {
                return res.status(400).json({
                    message: `Only ${product.stock} items are available for ${product.name}`
                });
            }

            const subtotal = product.price * cartItem.quantity;

            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: cartItem.quantity,
                subtotal
            });

            totalAmount += subtotal;
        }

        for (const cartItem of cartItems) {
            await Product.findByIdAndUpdate(
                cartItem.product._id,
                {
                    $inc: {
                        stock: -cartItem.quantity
                    }
                }
            );
        }

        const order = await Order.create({
            userId,
            items: orderItems,
            totalAmount
        });

        await Cart.deleteMany({ userId });

        res.status(201).json({
            message: "Order created successfully",
            order
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to create order",
            error: error.message
        });
    }
});


// ==========================================
// GET USER ORDERS
// ==========================================

router.get("/orders/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            userId,
            totalOrders: orders.length,
            orders
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch orders",
            error: error.message
        });
    }
});


// ==========================================
// GET SINGLE ORDER
// ==========================================

router.get("/orders/:userId/:orderId", async (req, res) => {
    try {
        const { userId, orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            userId
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch order",
            error: error.message
        });
    }
});


// ==========================================
// UPDATE ORDER STATUS
// ==========================================

router.patch("/orders/:orderId/status", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const allowedStatuses = [
            "pending",
            "confirmed",
            "shipped",
            "delivered",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        order.status = status;

        await order.save();

        res.status(200).json({
            message: "Order status updated",
            order
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update order status",
            error: error.message
        });
    }
});


// ==========================================
// CANCEL ORDER
// ==========================================

router.patch("/orders/:userId/:orderId/cancel", async (req, res) => {
    try {
        const { userId, orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            userId
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (order.status === "cancelled") {
            return res.status(400).json({
                message: "Order is already cancelled"
            });
        }

        if (
            order.status === "shipped" ||
            order.status === "delivered"
        ) {
            return res.status(400).json({
                message: "Order cannot be cancelled after shipping"
            });
        }

        // Restore product stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                {
                    $inc: {
                        stock: item.quantity
                    }
                }
            );
        }

        order.status = "cancelled";

        await order.save();

        res.status(200).json({
            message: "Order cancelled successfully",
            order
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to cancel order",
            error: error.message
        });
    }
});


module.exports = router;
