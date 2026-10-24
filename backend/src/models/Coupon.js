const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },
        discountType: {
            type: String,
            enum: ["percentage", "fixed"],
            required: true
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        minOrderAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        maxDiscount: {
            type: Number,
            default: null,
            min: 0
        },
        expiresAt: {
            type: Date,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

couponSchema.pre("validate", function () {
    if (
        this.discountType === "percentage" &&
        this.discountValue > 100
    ) {
        this.invalidate(
            "discountValue",
            "Percentage discount cannot exceed 100"
        );
    }
});

module.exports = mongoose.model("Coupon", couponSchema);
