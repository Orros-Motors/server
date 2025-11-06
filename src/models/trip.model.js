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
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    takeoffLocation: {
      type: String,
      required: true,
      trim: true,
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
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", tripSchema);

module.exports = { Trip };
