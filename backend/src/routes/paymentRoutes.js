const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Payment = require("../models/Payment");
const Order = require("../models/Order");

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create a payment record for an existing order.
// This records payment status; it does not charge a real card or UPI account.
router.post("/orders/:orderId/payment", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId, method, transactionId } = req.body;

    if (!validId(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    if (!userId || !method) {
      return res.status(400).json({
        message: "userId and method are required",
      });
    }

    if (!["cod", "upi", "card", "netbanking"].includes(method)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        message: "Cannot pay for a cancelled order",
      });
    }

    const existingPayment = await Payment.findOne({ orderId });

    if (existingPayment) {
      return res.status(409).json({
        message: "A payment record already exists for this order",
        payment: existingPayment,
      });
    }

    const payment = await Payment.create({
      orderId,
      userId,
      amount: order.totalAmount,
      method,
      transactionId: transactionId || undefined,
      status: method === "cod" ? "pending" : "pending",
    });

    return res.status(201).json({
      message: "Payment record created",
      payment,
      note: "No real payment was processed. Integrate a payment gateway to verify transactions.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Transaction ID already exists",
      });
    }

    console.error("Create payment error:", error);
    return res.status(500).json({
      message: "Failed to create payment",
    });
  }
});

// Get payments belonging to a user.
router.get("/payments/user/:userId", async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });

    return res.json(payments);
  } catch (error) {
    console.error("Fetch payments error:", error);
    return res.status(500).json({
      message: "Failed to fetch payments",
    });
  }
});

// Get a single payment.
router.get("/payments/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!validId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.json(payment);
  } catch (error) {
    console.error("Fetch payment error:", error);
    return res.status(500).json({
      message: "Failed to fetch payment",
    });
  }
});

// Update payment status.
// IMPORTANT: In production, only a trusted payment-gateway webhook or
// authenticated administrator should be allowed to mark payments completed.
router.patch("/payments/:paymentId/status", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    if (!validId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }

    if (!["completed", "failed"].includes(status)) {
      return res.status(400).json({
        message: "Status must be completed or failed",
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        message: "Only pending payments can be updated",
      });
    }

    const order = await Order.findById(payment.orderId);

    if (!order) {
      return res.status(404).json({ message: "Associated order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        message: "Cannot complete payment for a cancelled order",
      });
    }

    payment.status = status;

    if (status === "completed") {
      payment.paidAt = new Date();
      order.status = "confirmed";
      await order.save();
    }

    await payment.save();

    return res.json({
      message: "Payment status updated",
      payment,
    });
  } catch (error) {
    console.error("Update payment error:", error);
    return res.status(500).json({
      message: "Failed to update payment status",
    });
  }
});

// Record a refund. This does not issue a real money transfer.
router.patch("/payments/:paymentId/refund", async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!validId(paymentId)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "completed") {
      return res.status(400).json({
        message: "Only completed payments can be refunded",
      });
    }

    payment.status = "refunded";
    payment.refundedAt = new Date();
    await payment.save();

    return res.json({
      message: "Refund recorded",
      payment,
      note: "This records the refund in the database; it does not transfer money.",
    });
  } catch (error) {
    console.error("Refund error:", error);
    return res.status(500).json({
      message: "Failed to record refund",
    });
  }
});

module.exports = router;
