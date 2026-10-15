const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Review = require("../models/Review");

const router = express.Router();

// Add review to a product
router.post("/products/:id/reviews", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rating, comment } = req.body;

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

        if (!name || !rating || !comment) {
            return res.status(400).json({
                message: "Name, rating and comment are required"
            });
        }

        const numericRating = Number(rating);

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return res.status(400).json({
                message: "Rating must be an integer between 1 and 5"
            });
        }

        const review = await Review.create({
            product: id,
            name,
            rating: numericRating,
            comment
        });

        res.status(201).json(review);
    } catch (error) {
        res.status(400).json({
            message: "Failed to create review",
            error: error.message
        });
    }
});

// Get reviews for a product
router.get("/products/:id/reviews", async (req, res) => {
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

        const reviews = await Review.find({
            product: id
        }).sort({ createdAt: -1 });

        const totalReviews = reviews.length;

        const averageRating =
            totalReviews === 0
                ? 0
                : Number(
                      (
                          reviews.reduce(
                              (total, review) => total + review.rating,
                              0
                          ) / totalReviews
                      ).toFixed(1)
                  );

        res.status(200).json({
            productId: id,
            totalReviews,
            averageRating,
            reviews
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch reviews",
            error: error.message
        });
    }
});

module.exports = router;
