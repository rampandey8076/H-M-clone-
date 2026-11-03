const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    carrier: {
      type: String,
      required: true,
      trim: true,
    },

    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "processing",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
        "returned",
      ],
      default: "processing",
    },

    estimatedDelivery: {
      type: Date,
      default: null,
    },

    shippedAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    history: [
      {
        status: {
          type: String,
          required: true,
        },
        location: {
          type: String,
          default: "",
        },
        description: {
          type: String,
          default: "",
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shipment", shipmentSchema);
