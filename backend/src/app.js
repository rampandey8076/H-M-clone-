const express = require("express");
const productRoutes = require("./routes/productRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

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

// Review routes
app.use("/api", reviewRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "404 - Route not found"
    });
});

module.exports = app;