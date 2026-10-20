const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            trim: true
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    },
    {
        timestamps: true
    }
);

// A user cannot have the same product in multiple cart items
cartSchema.index(
    { userId: 1, product: 1 },
    { unique: true }
);

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
