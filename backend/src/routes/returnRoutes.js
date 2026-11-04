const express = require("express");
const mongoose = require("mongoose");

const Return = require("../models/Return");
const Order = require("../models/Order");
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

const statuses = [
  "approved",
  "rejected",
  "picked_up",
  "received",
  "refund_pending",
  "refunded",
];


// POST /api/returns
// Customer creates a return request.
router.post("/", async (req, res) => {
  try {
    const { orderId, reason, items } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Valid orderId is required" });
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return res.status(400).json({
        message: "Return reason must contain at least 5 characters",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one return item is required",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Validate requested products and quantities against the order.
    const orderItems = order.items || order.products || [];

    for (const item of items) {
      if (
        !item.productId ||
        !mongoose.Types.ObjectId.isValid(item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res.status(400).json({
          message: "Each item needs a valid productId and positive quantity",
        });
      }

      const orderedItem = orderItems.find((ordered) => {
        const id = ordered.productId || ordered.product;
        return id && id.toString() === item.productId.toString();
      });

      if (!orderedItem || item.quantity > orderedItem.quantity) {
        return res.status(400).json({
          message: "Return quantity exceeds the purchased quantity",
          productId: item.productId,
        });
      }
    }

    const existingReturn = await Return.findOne({
      orderId,
      userId: req.user._id,
    });

    if (existingReturn) {
      return res.status(409).json({
        message: "A return request already exists for this order",
        returnRequest: existingReturn,
      });
    }

    const returnRequest = await Return.create({
      orderId,
      userId: req.user._id,
      reason: reason.trim(),
      items,
      status: "requested",
      history: [
        {
          status: "requested",
          note: "Return request submitted by customer",
        },
      ],
    });

    res.status(201).json({
      message: "Return request created successfully",
      returnRequest,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A return request already exists for this order",
      });
    }

    res.status(500).json({
      message: "Failed to create return request",
      error: error.message,
    });
  }
});


// GET /api/returns/my
// Customer views their own return requests.
router.get("/my", async (req, res) => {
  try {
    const requests = await Return.find({
      userId: req.user._id,
    })
      .populate("orderId")
      .populate("items.productId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch return requests",
      error: error.message,
    });
  }
});


// GET /api/returns
// Admin views all return requests.
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const requests = await Return.find()
      .populate("orderId")
      .populate("userId", "name email")
      .populate("items.productId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch all return requests",
      error: error.message,
    });
  }
});


// GET /api/returns/:id
// Customer can view only their own request; admin can view any.
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid return ID" });
    }

    const filter = { _id: req.params.id };

    if (req.user.role !== "admin") {
      filter.userId = req.user._id;
    }

    const request = await Return.findOne(filter)
      .populate("orderId")
      .populate("items.productId")
      .populate("userId", "name email");

    if (!request) {
      return res.status(404).json({
        message: "Return request not found",
      });
    }

    res.status(200).json({ returnRequest: request });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch return request",
      error: error.message,
    });
  }
});


// PATCH /api/returns/:id/cancel
// Customer cancels a request that has not been processed.
router.patch("/:id/cancel", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid return ID" });
    }

    const request = await Return.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!request) {
      return res.status(404).json({
        message: "Return request not found",
      });
    }

    if (request.status !== "requested") {
      return res.status(400).json({
        message: "Only pending return requests can be cancelled",
      });
    }

    request.status = "cancelled";
    request.history.push({
      status: "cancelled",
      note: "Cancelled by customer",
    });

    await request.save();

    res.status(200).json({
      message: "Return request cancelled successfully",
      returnRequest: request,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel return request",
      error: error.message,
    });
  }
});


// PATCH /api/returns/:id/status
// Admin processes the return and records refund information.
router.patch("/:id/status", authorize("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid return ID" });
    }

    const { status, adminNote, refundAmount, refundReference } = req.body;

    if (!statuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        allowedStatuses: statuses,
      });
    }

    const request = await Return.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Return request not found",
      });
    }

    const transitions = {
      requested: ["approved", "rejected"],
      approved: ["picked_up"],
      picked_up: ["received"],
      received: ["refund_pending"],
      refund_pending: ["refunded"],
      rejected: [],
      refunded: [],
      cancelled: [],
    };

    if (!transitions[request.status]?.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${request.status} to ${status}`,
      });
    }

    if (status === "refund_pending" || status === "refunded") {
      if (
        refundAmount === undefined ||
        !Number.isFinite(refundAmount) ||
        refundAmount < 0
      ) {
        return res.status(400).json({
          message: "A valid non-negative refundAmount is required",
        });
      }

      request.refundAmount = refundAmount;
    }

    if (status === "refunded" && !refundReference) {
      return res.status(400).json({
        message: "Provide a refundReference after processing the refund",
      });
    }

    if (refundReference !== undefined) {
      request.refundReference = refundReference;
    }

    if (adminNote !== undefined) {
      request.adminNote = adminNote;
    }

    request.status = status;
    request.history.push({
      status,
      note: adminNote || `Admin changed status to ${status}`,
    });

    await request.save();

    res.status(200).json({
      message: "Return status updated successfully",
      returnRequest: request,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update return status",
      error: error.message,
    });
  }
});

module.exports = router;
