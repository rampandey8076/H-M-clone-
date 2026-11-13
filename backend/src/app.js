const express = require("express");

const productRoutes = require("./routes/productRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const couponRoutes = require("./routes/couponRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const profileRoutes = require("./routes/profileRoutes");
const addressRoutes = require("./routes/addressRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const returnRoutes = require("./routes/returnRoutes");

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

// Customer routes
app.use("/api", wishlistRoutes);
app.use("/api", cartRoutes);
app.use("/api", orderRoutes);
app.use("/api", inventoryRoutes);
app.use("/api", couponRoutes);
app.use("/api", reviewRoutes);
app.use("/api", paymentRoutes);
app.use("/api", authRoutes);

// Account and delivery routes
app.use("/api/profile", profileRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/returns", returnRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Keep the 404 handler LAST
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "404 - Route not found"
    });
});

module.exports = app;
