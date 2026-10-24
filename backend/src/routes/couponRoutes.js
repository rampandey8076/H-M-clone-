const express = require("express");
const mongoose = require("mongoose");

const Coupon = require("../models/Coupon");
const Cart = require("../models/Cart");

const router = express.Router();


// CREATE COUPON
router.post("/coupons", async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minOrderAmount = 0,
            maxDiscount = null,
            expiresAt
        } = req.body;

        if (
            typeof code !== "string" ||
            !code.trim() ||
            !["percentage", "fixed"].includes(discountType) ||
            typeof discountValue !== "number" ||
            !Number.isFinite(discountValue) ||
            discountValue <= 0 ||
            typeof minOrderAmount !== "number" ||
            !Number.isFinite(minOrderAmount) ||
            minOrderAmount < 0 ||
            (maxDiscount !== null &&
                (typeof maxDiscount !== "number" ||
                !Number.isFinite(maxDiscount) ||
                maxDiscount <= 0)) ||
            !expiresAt ||
            Number.isNaN(Date.parse(expiresAt)) ||
            new Date(expiresAt) <= new Date()
        ) {
            return res.status(400).json({
                message: "Provide valid coupon details and a future expiry date"
            });
        }

        if (
            discountType === "percentage" &&
            discountValue > 100
        ) {
            return res.status(400).json({
                message: "Percentage discount cannot exceed 100"
            });
        }

        const normalizedCode = code.trim().toUpperCase();

        const existingCoupon = await Coupon.findOne({
            code: normalizedCode
        });

        if (existingCoupon) {
            return res.status(409).json({
                message: "Coupon code already exists"
            });
        }

        const coupon = await Coupon.create({
            code: normalizedCode,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            expiresAt: new Date(expiresAt)
        });

        return res.status(201).json({
            message: "Coupon created successfully",
            coupon
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Coupon code already exists"
            });
        }

        res.status(500).json({
            message: "Failed to create coupon",
            error: error.message
        });
    }
});


// LIST ACTIVE COUPONS
router.get("/coupons", async (req, res) => {
    try {
        const coupons = await Coupon.find({
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).select("-__v");

        res.status(200).json({
            total: coupons.length,
            coupons
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch coupons",
            error: error.message
        });
    }
});


// APPLY COUPON TO CART AND CALCULATE TOTAL
router.post("/coupons/apply", async (req, res) => {
    try {
        const { userId, code } = req.body;

        if (
            typeof userId !== "string" ||
            !userId.trim() ||
            typeof code !== "string" ||
            !code.trim()
        ) {
            return res.status(400).json({
                message: "userId and coupon code are required"
            });
        }

        const coupon = await Coupon.findOne({
            code: code.trim().toUpperCase(),
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!coupon) {
            return res.status(404).json({
                message: "Coupon is invalid, inactive, or expired"
            });
        }

        const cartItems = await Cart.find({
            userId: userId.trim()
        }).populate("product");

        if (cartItems.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        let subtotal = 0;

        for (const item of cartItems) {
            if (!item.product) {
                return res.status(400).json({
                    message: "A product in your cart no longer exists"
                });
            }

            subtotal += item.product.price * item.quantity;
        }

        if (subtotal < coupon.minOrderAmount) {
            return res.status(400).json({
                message: `Minimum order amount is ${coupon.minOrderAmount}`,
                subtotal
            });
        }

        let discount = coupon.discountType === "percentage"
            ? subtotal * coupon.discountValue / 100
            : coupon.discountValue;

        if (coupon.maxDiscount !== null) {
            discount = Math.min(discount, coupon.maxDiscount);
        }

        // A discount must never make the payable amount negative.
        discount = Math.min(discount, subtotal);
        discount = Math.round(discount * 100) / 100;

        const total = Math.round((subtotal - discount) * 100) / 100;

        res.status(200).json({
            message: "Coupon applied successfully",
            couponCode: coupon.code,
            subtotal,
            discount,
            total
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to apply coupon",
            error: error.message
        });
    }
});


// DEACTIVATE COUPON
router.patch("/coupons/:id/deactivate", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid coupon ID"
            });
        }

        const coupon = await Coupon.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true, runValidators: true }
        );

        if (!coupon) {
            return res.status(404).json({
                message: "Coupon not found"
            });
        }

        res.status(200).json({
            message: "Coupon deactivated successfully",
            coupon
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to deactivate coupon",
            error: error.message
        });
    }
});

module.exports = router;
