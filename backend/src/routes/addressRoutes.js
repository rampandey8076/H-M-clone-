const express = require("express");
const mongoose = require("mongoose");

const Address = require("../models/Address");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);


// ============================================================
// POST /api/addresses
// Create a new address
// ============================================================

router.post("/", async (req, res) => {
  try {
    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      type,
      isDefault,
    } = req.body;

    if (
      !fullName ||
      !phone ||
      !addressLine1 ||
      !city ||
      !state ||
      !postalCode
    ) {
      return res.status(400).json({
        message:
          "fullName, phone, addressLine1, city, state and postalCode are required",
      });
    }

    // If this is the first address, automatically make it default.
    const addressCount = await Address.countDocuments({
      userId: req.user._id,
    });

    const shouldBeDefault = addressCount === 0 || isDefault === true;

    // If making this address default, remove default from existing addresses.
    if (shouldBeDefault) {
      await Address.updateMany(
        { userId: req.user._id },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.create({
      userId: req.user._id,
      fullName,
      phone,
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      state,
      postalCode,
      country: country || "India",
      type: type || "home",
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      message: "Address created successfully",
      address,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid address data",
        error: error.message,
      });
    }

    res.status(500).json({
      message: "Failed to create address",
      error: error.message,
    });
  }
});


// ============================================================
// GET /api/addresses
// Get all addresses of logged-in user
// ============================================================

router.get("/", async (req, res) => {
  try {
    const addresses = await Address.find({
      userId: req.user._id,
    }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch addresses",
      error: error.message,
    });
  }
});


// ============================================================
// GET /api/addresses/:id
// Get one address
// ============================================================

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    res.status(200).json({
      address,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch address",
      error: error.message,
    });
  }
});


// ============================================================
// PATCH /api/addresses/:id
// Update address
// ============================================================

router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid address ID",
      });
    }

    const allowedFields = [
      "fullName",
      "phone",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "postalCode",
      "country",
      "type",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const address = await Address.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    res.status(200).json({
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid address data",
        error: error.message,
      });
    }

    res.status(500).json({
      message: "Failed to update address",
      error: error.message,
    });
  }
});


// ============================================================
// DELETE /api/addresses/:id
// Delete address
// ============================================================

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    // If deleted address was default, make the newest remaining address default.
    if (address.isDefault) {
      const nextAddress = await Address.findOne({
        userId: req.user._id,
      }).sort({
        createdAt: -1,
      });

      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.status(200).json({
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete address",
      error: error.message,
    });
  }
});


// ============================================================
// PATCH /api/addresses/:id/default
// Make address default
// ============================================================

router.patch("/:id/default", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    await Address.updateMany(
      {
        userId: req.user._id,
        _id: { $ne: address._id },
      },
      {
        $set: { isDefault: false },
      }
    );

    address.isDefault = true;
    await address.save();

    res.status(200).json({
      message: "Default address updated successfully",
      address,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to set default address",
      error: error.message,
    });
  }
});


module.exports = router;
