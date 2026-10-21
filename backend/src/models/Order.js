const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            trim: true
        },
        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (items) => items.length > 0,
                message: "Order must contain at least one item"
            }
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
            default: "pending"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
