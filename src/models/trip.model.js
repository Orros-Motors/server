const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    tripName: {
      type: String,
      required: true,
      trim: true,
    },
    tripId: {
      type: String,
      required: false,
      unique: false,
      trim: false,
    },
    bus: {
      type: String,
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
    },

    dropoff: {
      city: {
        type: String,
        required: true,
        trim: true,
      },
      location: {
        type: String,
        required: true,
        trim: true,
      },
    },

    pickup: {
      city: {
        type: String,
        required: true,
        trim: true,
      },
      location: {
        type: String,
        required: true,
        trim: true,
      },
    },

    departureTime: {
      type: String, // e.g., "08:30 AM"
      required: true,
    },
    arrivalTime: {
      type: String, // e.g., "04:15 PM"
      required: true,
    },

    takeoff: {
      date: {
        type: Date,
        required: true,
      },
      time: {
        type: String,
        required: true,
      },
    },
    reschedule: {
      date: {
        type: Date,
      },
      time: {
        type: String,
      },
      rescheduled: {
        type: Boolean,
      },
    },

    seatCount: {
      type: Number,
      required: false,
      min: 1,
    },
    seats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Seat",
      },
    ],

    // ✅ Add price field
    price: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },

    vehicleType: {
      type: String,
    },
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", tripSchema);

module.exports = { Trip };
