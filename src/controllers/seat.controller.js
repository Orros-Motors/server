const { Seat } = require("../models/seat.model");

// Book a seat (set isBooking = true)
exports.bookSeat = async (req, res) => {
  try {
    const { seatId, position, tripId } = req.body;
    const userId = req.user.id;

    let seat;
    if (seatId) {
      seat = await Seat.findById(seatId);
    } else if (position !== undefined && tripId) {
      seat = await Seat.findOne({ trip: tripId, position });
    }

    if (!seat) {
      return res.status(404).json({ success: false, message: "Seat not found" });
    }

    if (seat.isBooking) {
      return res.status(400).json({ success: false, message: "Seat is already being booked" });
    }

    seat.isBooking = true;
    seat.bookedBy = userId;
    await seat.save();

    res.status(200).json({ success: true, message: "Seat booking in progress", seat });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Confirm booking (set isBooked = true)
exports.confirmBooking = async (req, res) => {
  try {
    const { seatId, position, tripId } = req.body;
    const userId = req.user.id;

    let seat;
    if (seatId) {
      seat = await Seat.findById(seatId);
    } else if (position !== undefined && tripId) {
      seat = await Seat.findOne({ trip: tripId, position });
    }

    if (!seat) {
      return res.status(404).json({ success: false, message: "Seat not found" });
    }

    seat.isBooking = false;
    seat.isBooked = true;
    seat.bookedBy = userId;
    await seat.save();

    res.status(200).json({ success: true, message: "Seat booked successfully", seat });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark seat as paid
exports.markPaid = async (req, res) => {
  try {
    const { seatId, position, tripId } = req.body;
    const userId = req.user.id;

    let seat;
    if (seatId) {
      seat = await Seat.findById(seatId);
    } else if (position !== undefined && tripId) {
      seat = await Seat.findOne({ trip: tripId, position });
    }

    if (!seat) {
      return res.status(404).json({ success: false, message: "Seat not found" });
    }

    seat.isPaid = true;
    seat.paidBy = userId;
    await seat.save();

    res.status(200).json({ success: true, message: "Seat payment confirmed", seat });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get available seats for a trip
exports.getAvailableSeats = async (req, res) => {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ success: false, message: "Trip ID is required" });
    }

    const seats = await Seat.find({ trip: tripId, isBooked: false }).sort({ position: 1 });

    res.status(200).json({ success: true, message: "Available seats fetched", seats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};