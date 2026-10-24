const express = require("express");
const productRoutes = require("./routes/productRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const couponRoutes = require("./routes/couponRoutes");

const app = express();

// Middleware
app.use(express.json());

// Home
app.get("/", (req, res) => {
    res.send("H&M Clone API is running");
});

// About
app.get("/about", (req, res) => {
    res.send("This is the H&M Clone backend");
});

// Product routes
app.use("/api/products", productRoutes);
app.use("/api", wishlistRoutes);

// Cart routes
app.use("/api", cartRoutes);

// Order routes
app.use("/api", orderRoutes);

// Inventory routes
app.use("/api", inventoryRoutes);

// Coupon routes
app.use("/api", couponRoutes);

// Review routes
app.use("/api", reviewRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "404 - Route not found"
    });
});

module.exports = app;
