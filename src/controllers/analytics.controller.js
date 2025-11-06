const { Trip } = require("../models/trip.model");
const { Seat } = require("../models/seat.model");
const mongoose = require("mongoose");

// Get total trips per status
exports.getTripsCountByStatus = async (req, res) => {
  try {
    const counts = await Trip.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get total seats booked per trip
exports.getBookedSeatsCount = async (req, res) => {
  try {
    const counts = await Seat.aggregate([
      { $match: { isBooked: true } },
      {
        $group: {
          _id: "$trip",
          bookedSeats: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "trips",
          localField: "_id",
          foreignField: "_id",
          as: "trip",
        },
      },
      { $unwind: "$trip" },
      {
        $project: {
          _id: 0,
          tripId: "$trip._id",
          tripName: "$trip.tripName",
          bookedSeats: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get trips count for a specific day
exports.getTripsCountByDay = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "Date is required (YYYY-MM-DD)" });
    }

    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const count = await Trip.countDocuments({
      "takeoff.date": { $gte: start, $lte: end },
    });

    res.status(200).json({ success: true, date, tripsCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get overall analytics
exports.getOverallAnalytics = async (req, res) => {
  try {
    const tripsCount = await Trip.countDocuments();
    const bookedSeats = await Seat.countDocuments({ isBooked: true });
    const paidSeats = await Seat.countDocuments({ isPaid: true });
    const ongoingTrips = await Trip.countDocuments({ status: "ongoing" });
    const completedTrips = await Trip.countDocuments({ status: "completed" });

    res.status(200).json({
      success: true,
      data: {
        tripsCount,
        bookedSeats,
        paidSeats,
        ongoingTrips,
        completedTrips,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
