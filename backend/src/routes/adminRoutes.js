const express = require("express");

const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Payment = require("../models/Payment");

const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorize("admin"));

function getDateFilter(query) {
    const filter = {};

    if (query.startDate) {
        const start = new Date(query.startDate);

        if (Number.isNaN(start.getTime())) {
            const error = new Error("Invalid startDate");
            error.status = 400;
            throw error;
        }

        filter.$gte = start;
    }

    if (query.endDate) {
        const end = new Date(query.endDate);

        if (Number.isNaN(end.getTime())) {
            const error = new Error("Invalid endDate");
            error.status = 400;
            throw error;
        }

        end.setHours(23, 59, 59, 999);
        filter.$lte = end;
    }

    if (
        filter.$gte &&
        filter.$lte &&
        filter.$gte > filter.$lte
    ) {
        const error = new Error("startDate must be before endDate");
        error.status = 400;
        throw error;
    }

    return Object.keys(filter).length ? filter : null;
}

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function pagination(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}

// GET /api/admin/dashboard
router.get(
    "/dashboard",
    asyncHandler(async (req, res) => {
        const [
            totalUsers,
            activeUsers,
            totalProducts,
            totalOrders,
            orderStatuses,
            paymentStats,
            lowStockProducts,
        ] = await Promise.all([
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: "user", isActive: true }),
            Product.countDocuments(),
            Order.countDocuments(),

            Order.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),

            Payment.aggregate([
                {
                    $group: {
                        _id: "$status",
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),

            Product.countDocuments({ stock: { $lte: 5 } }),
        ]);

        const revenue = paymentStats.find(
            (item) => item._id === "completed"
        )?.total || 0;

        const refunded = paymentStats.find(
            (item) => item._id === "refunded"
        )?.total || 0;

        const totalPayments = paymentStats.reduce(
            (sum, item) => sum + item.count,
            0
        );

        res.json({
            success: true,
            dashboard: {
                customers: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: totalUsers - activeUsers,
                },
                products: {
                    total: totalProducts,
                    lowStock: lowStockProducts,
                },
                orders: {
                    total: totalOrders,
                    byStatus: Object.fromEntries(
                        orderStatuses.map((item) => [item._id, item.count])
                    ),
                },
                payments: {
                    total: totalPayments,
                    completedRevenue: revenue,
                    refundedAmount: refunded,
                    netRevenue: revenue - refunded,
                },
            },
        });
    })
);

// GET /api/admin/sales
router.get(
    "/sales",
    asyncHandler(async (req, res) => {
        const dateFilter = getDateFilter(req.query);

        const match = {
            status: { $in: ["completed", "refunded"] },
        };

        if (dateFilter) {
            match.createdAt = dateFilter;
        }

        const results = await Payment.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$status",
                    amount: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const completed = results.find(
            (item) => item._id === "completed"
        );

        const refunded = results.find(
            (item) => item._id === "refunded"
        );

        const revenue = completed?.amount || 0;
        const refundAmount = refunded?.amount || 0;

        res.json({
            success: true,
            sales: {
                completedPayments: completed?.count || 0,
                refundedPayments: refunded?.count || 0,
                grossRevenue: revenue,
                refundedAmount: refundAmount,
                netRevenue: revenue - refundAmount,
                currency: "INR",
            },
        });
    })
);

// GET /api/admin/orders
router.get(
    "/orders",
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = pagination(req.query);
        const filter = {};

        if (req.query.status) {
            const allowedStatuses = [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
            ];

            if (!allowedStatuses.includes(req.query.status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order status",
                });
            }

            filter.status = req.query.status;
        }

        const [orders, total, statusCounts] = await Promise.all([
            Order.find(filter)
                .select("-__v")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Order.countDocuments(filter),

            Order.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        res.json({
            success: true,
            summary: Object.fromEntries(
                statusCounts.map((item) => [item._id, item.count])
            ),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            orders,
        });
    })
);

// GET /api/admin/customers
router.get(
    "/customers",
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = pagination(req.query);

        const filter = { role: "user" };

        if (req.query.active === "true") {
            filter.isActive = true;
        } else if (req.query.active === "false") {
            filter.isActive = false;
        }

        const [customers, total] = await Promise.all([
            User.find(filter)
                .select("name email role isActive createdAt updatedAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            User.countDocuments(filter),
        ]);

        res.json({
            success: true,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            customers,
        });
    })
);

// GET /api/admin/inventory
router.get(
    "/inventory",
    asyncHandler(async (req, res) => {
        const threshold = Math.min(
            1000,
            Math.max(0, parseInt(req.query.threshold, 10) || 5)
        );

        const { page, limit, skip } = pagination(req.query);

        const [totalProducts, totalUnits, lowStockCount, outOfStockCount, lowStockProducts] =
            await Promise.all([
                Product.countDocuments(),

                Product.aggregate([
                    {
                        $group: {
                            _id: null,
                            units: { $sum: "$stock" },
                        },
                    },
                ]),

                Product.countDocuments({
                    stock: { $lte: threshold, $gt: 0 },
                }),

                Product.countDocuments({ stock: 0 }),

                Product.find({ stock: { $lte: threshold } })
                    .select("name category price stock images")
                    .sort({ stock: 1, name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
            ]);

        res.json({
            success: true,
            inventory: {
                totalProducts,
                totalUnits: totalUnits[0]?.units || 0,
                lowStockCount,
                outOfStockCount,
                threshold,
            },
            pagination: {
                page,
                limit,
                total: lowStockCount + outOfStockCount,
                totalPages: Math.ceil(
                    (lowStockCount + outOfStockCount) / limit
                ),
            },
            lowStockProducts,
        });
    })
);

// GET /api/admin/revenue?period=day|month
router.get(
    "/revenue",
    asyncHandler(async (req, res) => {
        const period = req.query.period || "day";

        if (!["day", "month"].includes(period)) {
            return res.status(400).json({
                success: false,
                message: "period must be day or month",
            });
        }

        const dateFilter = getDateFilter(req.query);

        const match = { status: "completed" };

        if (dateFilter) {
            match.createdAt = dateFilter;
        }

        const dateFormat = period === "month" ? "%Y-%m" : "%Y-%m-%d";

        const revenue = await Payment.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: dateFormat,
                            date: "$createdAt",
                            timezone: "UTC",
                        },
                    },
                    revenue: { $sum: "$amount" },
                    payments: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            success: true,
            period,
            currency: "INR",
            revenue,
        });
    })
);

// Error handler for admin route validation and database errors
router.use((error, req, res, next) => {
    console.error("Admin API error:", error);

    res.status(error.status || 500).json({
        success: false,
        message:
            error.status && error.status < 500
                ? error.message
                : "Admin analytics request failed",
    });
});

module.exports = router;
