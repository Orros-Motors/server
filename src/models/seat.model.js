const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    position: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    isBooked: { type: Boolean, default: false },
    isBooking: { type: Boolean, default: false },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bookingBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const Seat = mongoose.model("Seat", seatSchema);
module.exports = { Seat };