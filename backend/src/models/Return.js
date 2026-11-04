const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        reason: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],
    status: {
      type: String,
      enum: [
        "requested",
        "approved",
        "rejected",
        "picked_up",
        "received",
        "refund_pending",
        "refunded",
        "cancelled",
      ],
      default: "requested",
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    refundReference: {
      type: String,
      trim: true,
      default: "",
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    history: [
      {
        status: {
          type: String,
          required: true,
        },
        note: {
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

returnSchema.index({ orderId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Return", returnSchema);
