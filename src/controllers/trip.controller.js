const { Trip } = require("../models/trip.model");
const { Seat } = require("../models/seat.model");
const { generateTripId } = require("../utils/generate_trip_id");

exports.createTrip = async (req, res) => {
  try {
    const {
      tripName,
      bus,
      takeoff,
      seatCount,
      admin,
      destination,
      takeoffLocation,
    } = req.body;

    if (
      !tripName ||
      !bus ||
      !takeoff?.date ||
      !takeoff?.time ||
      !seatCount ||
      !admin ||
      !destination ||
      !takeoffLocation
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Create a new trip
    const trip = new Trip({
      tripName,
      tripId: generateTripId(),
      bus,
      takeoff,
      seatCount,
      admin,
      destination,
      takeoffLocation,
    });

    await trip.save();

    // Generate an array of seat numbers [1, 2, 3, ..., seatCount]
    let seatNumbers = Array.from({ length: seatCount }, (_, i) => i + 1);

    // Randomize seat order
    for (let i = seatNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seatNumbers[i], seatNumbers[j]] = [seatNumbers[j], seatNumbers[i]];
    }

    // Create seats in DB
    const seats = [];
    for (const number of seatNumbers) {
      const seat = await Seat.create({
        position: number,
        trip: trip._id,
      });
      seats.push(seat._id);
    }

    trip.seats = seats;
    await trip.save();

    // Populate full seat details
    const fullTrip = await Trip.findById(trip._id).populate("seats");

    res.status(201).json({
      success: true,
      message: `Trip created successfully with ${seatCount} seats`,
      trip: fullTrip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while creating trip",
      error: error.message,
    });
  }
};
exports.updateTrip = async (req, res) => {
  try {
    const { id, ...updates } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const trip = await Trip.findByIdAndUpdate(id, updates, { new: true });

    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      trip,
    });
  } catch (error) {
    console.error("❌ Error updating trip:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating trip",
      error: error.message,
    });
  }
};

// ✅ Delete a trip (ID from body)
exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const trip = await Trip.findByIdAndDelete(id);
    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    await Seat.deleteMany({ trip: id });

    res.status(200).json({
      success: true,
      message: "Trip and its seats deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting trip:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting trip",
      error: error.message,
    });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(id)
      .populate({
        path: "seats",
        select: "position isBooked isBooking isPaid trip createdAt updatedAt",
      })
      .populate("admin", "name email");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trip fetched successfully with seat details",
      trip,
    });
  } catch (error) {
    console.error("❌ Error fetching trip:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching trip",
      error: error.message,
    });
  }
};

// ✅ Get All Trips (each with full seat details)
exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate({
        path: "seats",
        select: "position isBooked isBooking isPaid trip createdAt updatedAt",
      })
      .populate("admin", "name email");

    res.status(200).json({
      success: true,
      message: "All trips fetched successfully with seat details",
      trips,
    });
  } catch (error) {
    console.error("❌ Error fetching trips:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching trips",
      error: error.message,
    });
  }
};

exports.getTripsByStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status)
      return res
        .status(400)
        .json({ success: false, message: "Trip status is required" });

    const trips = await Trip.find({ status })
      .populate({
        path: "seats",
        select: "position isBooked isBooking isPaid trip createdAt updatedAt",
      })
      .populate("admin", "name email");

    res.status(200).json({
      success: true,
      message: `Trips with status "${status}" fetched successfully`,
      trips,
    });
  } catch (error) {
    console.error("❌ Error fetching trips by status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching trips by status",
      error: error.message,
    });
  }
};

exports.searchTrips = async (req, res) => {
  try {
    const { tripName, status, destination, takeoffDate, takeoffLocation } =
      req.body;

    const filter = {};

    if (tripName) filter.tripName = { $regex: tripName, $options: "i" };
    if (status) filter.status = status;
    if (destination)
      filter.destination = { $regex: destination, $options: "i" };
    if (takeoffLocation)
      filter.takeoffLocation = { $regex: takeoffLocation, $options: "i" };
    if (takeoffDate) {
      const start = new Date(takeoffDate);
      const end = new Date(takeoffDate);
      end.setHours(23, 59, 59, 999);
      filter["takeoff.date"] = { $gte: start, $lte: end };
    }

    const trips = await Trip.find(filter)
      .populate("seats")
      .populate("admin", "name email");

    res.status(200).json({
      success: true,
      message: "Trips fetched successfully",
      trips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while searching trips",
      error: error.message,
    });
  }
};
