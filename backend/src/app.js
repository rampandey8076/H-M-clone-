const express = require("express");
const productRoutes = require("./routes/productRoutes");

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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        message: "404 - Route not found"
    });
});

module.exports = app;