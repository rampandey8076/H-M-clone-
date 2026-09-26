const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        price: {
            type: Number,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        images: {
            type: [String],
            default: []
        },

        sizes: {
            type: [String],
            default: []
        },

        colors: {
            type: [String],
            default: []
        },

        stock: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;