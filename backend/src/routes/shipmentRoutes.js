const express = require("express");
const mongoose = require("mongoose");

const Shipment = require("../models/Shipment");
const Order = require("../models/Order");
const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

const allowedStatuses = [
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
];


// ============================================================
// POST /api/shipments
// Admin creates shipment for an order
// ============================================================

router.post("/", authorize("admin"), async (req, res) => {
  try {
    const {
      orderId,
      carrier,
      trackingNumber,
      estimatedDelivery,
    } = req.body;

    if (!orderId || !carrier || !trackingNumber) {
      return res.status(400).json({
        message: "orderId, carrier and trackingNumber are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    if (
      estimatedDelivery &&
      Number.isNaN(Date.parse(estimatedDelivery))
    ) {
      return res.status(400).json({
        message: "Invalid estimated delivery date",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (!order.userId) {
      return res.status(400).json({
        message: "Order does not contain a user ID",
      });
    }

    const existingShipment = await Shipment.findOne({ orderId });

    if (existingShipment) {
      return res.status(409).json({
        message: "A shipment already exists for this order",
      });
    }

    const shipment = await Shipment.create({
      orderId,
      userId: order.userId,
      carrier,
      trackingNumber,
      estimatedDelivery: estimatedDelivery || null,
      status: "processing",
      history: [
        {
          status: "processing",
          description: "Shipment created",
        },
      ],
    });

    res.status(201).json({
      message: "Shipment created successfully",
      shipment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Order or tracking number already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create shipment",
      error: error.message,
    });
  }
});


// ============================================================
// GET /api/shipments/my
// Logged-in user gets their shipments
// ============================================================

router.get("/my", async (req, res) => {
  try {
    const shipments = await Shipment.find({
      userId: req.user._id,
    })
      .populate("orderId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch shipments",
      error: error.message,
    });
  }
});


// ============================================================
// GET /api/shipments
// Admin gets all shipments
// ============================================================

router.get("/", authorize("admin"), async (req, res) => {
  try {
    const shipments = await Shipment.find()
      .populate("orderId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch shipments",
      error: error.message,
    });
  }
});


// ============================================================
// GET /api/shipments/:id
// User can only view their own shipment
// ============================================================

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid shipment ID",
      });
    }

    const shipment = await Shipment.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("orderId");

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    res.status(200).json({ shipment });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch shipment",
      error: error.message,
    });
  }
});


// ============================================================
// PATCH /api/shipments/:id/status
// Admin updates shipment status
// ============================================================

router.patch("/:id/status", authorize("admin"), async (req, res) => {
  try {
    const { status, location, description, estimatedDelivery } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid shipment ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid shipment status",
        allowedStatuses,
      });
    }

    if (
      estimatedDelivery !== undefined &&
      estimatedDelivery !== null &&
      Number.isNaN(Date.parse(estimatedDelivery))
    ) {
      return res.status(400).json({
        message: "Invalid estimated delivery date",
      });
    }

    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        message: "Shipment not found",
      });
    }

    shipment.status = status;

    if (estimatedDelivery !== undefined) {
      shipment.estimatedDelivery = estimatedDelivery;
    }

    if (status === "shipped" && !shipment.shippedAt) {
      shipment.shippedAt = new Date();
    }

    if (status === "delivered") {
      shipment.deliveredAt = new Date();
    }

    if (status !== "delivered") {
      shipment.deliveredAt = null;
    }

    shipment.history.push({
      status,
      location: location || "",
      description: description || `Shipment status changed to ${status}`,
      updatedAt: new Date(),
    });

    await shipment.save();

    res.status(200).json({
      message: "Shipment status updated successfully",
      shipment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update shipment",
      error: error.message,
    });
  }
});

module.exports = router;
