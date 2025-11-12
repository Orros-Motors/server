const { Trip } = require("../models/trip.model");
const { Seat } = require("../models/seat.model");
const { generateTripId } = require("../utils/generate_trip_id");
const { Booking } = require("../models/booking.model");

exports.createTrip = async (req, res) => {
  try {
    const {
      tripName,
      bus,
      takeoff, // { date: string, time?: string }
      seatCount,
      admin,
      pickup,
      dropoff,
      departureTime, // Can replace takeoff.time
      arrivalTime,
      price,
      vehicleType,
    } = req.body;

    // Log all incoming data
    console.log("🔹 Incoming trip data:");
    console.log({
      tripName,
      bus,
      takeoff,
      seatCount,
      admin,
      pickup,
      dropoff,
      departureTime,
      arrivalTime,
      price,
      vehicleType,
    });

    // Validate required fields
    if (
      !tripName ||
      !bus ||
      !takeoff?.date ||
      !(takeoff?.time || departureTime) || // either takeoff.time or departureTime
      !seatCount ||
      //   !admin ||
      !pickup?.city ||
      !pickup?.location ||
      !dropoff?.city ||
      !dropoff?.location ||
      !arrivalTime ||
      !price ||
      !vehicleType
    ) {
      console.log("⚠️ Validation failed: missing required fields");
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Use departureTime if takeoff.time is missing
    const tripTakeoff = {
      date: takeoff.date,
      time: takeoff.time || departureTime,
    };

    console.log("🔹 Using takeoff object:", tripTakeoff);

    const trip = new Trip({
      tripName,
      tripId: generateTripId(),
      bus,
      takeoff: tripTakeoff,
      seatCount,
      admin,
      pickup,
      dropoff,
      departureTime: tripTakeoff.time, // store separately if needed
      arrivalTime,
      price,
      vehicleType,
    });

    await trip.save();
    console.log("✅ Trip saved to DB:", trip);

    // Create seats
    const seatNumbers = Array.from({ length: seatCount }, (_, i) => i + 1).sort(
      () => Math.random() - 0.5
    ); // shuffle
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
    console.log("✅ Seats created and assigned:", seats);

    const fullTrip = await Trip.findById(trip._id).populate("seats");
    console.log("🔹 Full trip object:", fullTrip);

    res.status(201).json({
      success: true,
      message: `Trip created successfully with ${seatCount} seats`,
      trip: fullTrip,
    });
  } catch (error) {
    console.error("❌ Error creating trip:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating trip",
      error: error.message,
    });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    console.log("🚀 Received updateTrip request:", req.body);

    const { id, ...updates } = req.body;
    console.log("📝 Trip ID:", id);
    console.log("📝 Updates object:", updates);

    if (!id) {
      console.log("❌ Trip ID missing in request");
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const trip = await Trip.findById(id).populate("seats");
    console.log("🔎 Found trip:", trip);

    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    let updatedSeats = trip.seats.map((s) => s._id);
    console.log("💺 Existing seats:", updatedSeats);

    if (updates.seatCount && typeof updates.seatCount === "number") {
      const currentCount = updatedSeats.length;
      const desiredCount = updates.seatCount;
      console.log(
        `🔧 Adjusting seats: current=${currentCount}, desired=${desiredCount}`
      );
      if (desiredCount < currentCount) {
        const seatsToRemove = currentCount - desiredCount;
        console.log(`➖ Removing last ${seatsToRemove} seat(s)`);
        const removedSeats = updatedSeats.splice(-seatsToRemove, seatsToRemove);
        await Seat.deleteMany({ _id: { $in: removedSeats } });
        console.log("🗑 Removed Seat IDs:", removedSeats);
      } else if (desiredCount > currentCount) {
        const seatsToAdd = desiredCount - currentCount;
        console.log(`➕ Adding ${seatsToAdd} new seat(s)`);
        for (let i = 0; i < seatsToAdd; i++) {
          const seat = await Seat.create({
            position: currentCount + i + 1,
            trip: trip._id,
          });
          updatedSeats.push(seat._id);
          console.log("✅ Added new seat:", seat);
        }
      } else {
        console.log("ℹ️ Seat count matches, no changes needed");
      }
      delete updates.seatCount;
    }

    if (updates.seats && Array.isArray(updates.seats)) {
      console.log("⚙️ Processing seat updates:", updates.seats);
      const seatUpdates = updates.seats;

      for (const seatData of seatUpdates) {
        console.log("🔹 Processing seatData:", seatData);
        let seat;

        if (seatData._id) {
          console.log("✏️ Updating existing seat with ID:", seatData._id);
          seat = await Seat.findByIdAndUpdate(seatData._id, seatData, {
            new: true,
          });
        } else {
          console.log("➕ Creating new seat:", seatData);
          seat = await Seat.create({
            ...seatData,
            trip: trip._id,
          });
        }

        if (!updatedSeats.includes(seat._id)) updatedSeats.push(seat._id);
        console.log("✅ Processed seat:", seat);
      }

      delete updates.seats;
      console.log(
        "🗑 Removed seats from updates object, remaining updates:",
        updates
      );
    }

    console.log("✏️ Updating trip with:", { ...updates, seats: updatedSeats });
    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      { ...updates, seats: updatedSeats },
      { new: true }
    ).populate("seats");

    console.log("🎉 Trip updated successfully:", updatedTrip);

    res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      trip: updatedTrip,
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

// ✅ Delete Trip
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

// ✅ Get Trip by ID
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

// ✅ Get All Trips
exports.getAllTrips = async (req, res) => {
  try {
    console.log("🚀 Fetching all trips...");

    const trips = await Trip.find()
      .populate({
        path: "seats",
        select: "position isBooked isBooking isPaid trip createdAt updatedAt",
      })
      .populate("admin", "name email");

    console.log(`✅ Fetched ${trips.length} trips with seats and admin info`);

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

// ✅ Get Trips by Status
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

// ✅ Search Trips
exports.searchTrips = async (req, res) => {
  try {
    const { tripName, status, pickupCity, dropoffCity, takeoffDate } = req.body;

    const filter = {};

    if (tripName) filter.tripName = { $regex: tripName, $options: "i" };
    if (status) filter.status = status;
    if (pickupCity)
      filter["pickup.city"] = { $regex: pickupCity, $options: "i" };
    if (dropoffCity)
      filter["dropoff.city"] = { $regex: dropoffCity, $options: "i" };
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
exports.getTripsByCitiesAndDate = async (req, res) => {
  try {
    const {
      pickupCity,
      destinationCity,
      pickupLocation,
      destinationLocation,
      departureDate,
    } = req.body;

    console.log("📥 Incoming Request Body:", req.body);

    if (!pickupCity || !destinationCity || !departureDate) {
      console.log("⚠️ Missing required fields:", {
        pickupCity,
        destinationCity,
        pickupLocation,
        destinationLocation,
        departureDate,
      });
      return res.status(400).json({
        success: false,
        message: "pickupCity, destinationCity, and departureDate are required",
      });
    }

    const now = new Date();
    const targetDate = new Date(departureDate);

    // Normalize & prepare fuzzy city/location matching
    const normalize = (str = "") => str.trim().toLowerCase();
    const pickupPrefix = normalize(pickupCity).substring(0, 4);
    const destinationPrefix = normalize(destinationCity).substring(0, 4);
    const pickupLocationPrefix = pickupLocation
      ? normalize(pickupLocation).substring(0, 4)
      : "";
    const destinationLocationPrefix = destinationLocation
      ? normalize(destinationLocation).substring(0, 4)
      : "";

    console.log("🔍 Matching parameters:", {
      pickupPrefix,
      destinationPrefix,
      pickupLocationPrefix,
      destinationLocationPrefix,
    });

    // Build dynamic query (include both city and location fuzzy matches)
    const query = {
      $and: [
        {
          $or: [
            { "pickup.city": { $regex: pickupPrefix, $options: "i" } },
            pickupLocationPrefix
              ? {
                  "pickup.location": {
                    $regex: pickupLocationPrefix,
                    $options: "i",
                  },
                }
              : {},
          ],
        },
        {
          $or: [
            { "dropoff.city": { $regex: destinationPrefix, $options: "i" } },
            destinationLocationPrefix
              ? {
                  "dropoff.location": {
                    $regex: destinationLocationPrefix,
                    $options: "i",
                  },
                }
              : {},
          ],
        },
      ],
    };

    console.log("🧩 Final Query:", JSON.stringify(query, null, 2));

    // Fetch matching trips
    const trips = await Trip.find(query)
      .populate("seats")
      .populate("admin", "name email");

    console.log(`🚌 Found ${trips.length} total trips before date filtering.`);

    if (!trips.length) {
      console.log("❌ No trips found matching provided criteria.");
      return res.status(404).json({
        success: false,
        message: "No trips found for the provided criteria",
      });
    }

    // Filter and map upcoming trips
    const tripsWithDuration = trips
      .map((trip) => {
        console.log("🧾 Processing Trip:", {
          id: trip._id,
          pickup: trip.pickup.city,
          dropoff: trip.dropoff.city,
          pickupLocation: trip.pickup.location,
          dropoffLocation: trip.dropoff.location,
          takeoffDate: trip.takeoff.date,
          takeoffTime: trip.takeoff.time,
        });

        const takeoffDateTime = new Date(
          `${trip.takeoff.date.toISOString().split("T")[0]}T${
            trip.takeoff.time
          }`
        );

        const diffMs = takeoffDateTime - now;
        if (diffMs < 0) {
          console.log(`⏰ Skipping past trip ${trip._id}`);
          return null;
        }

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const duration = `${hours} hr${hours !== 1 ? "s" : ""} ${minutes} min${
          minutes !== 1 ? "s" : ""
        }`;

        return { ...trip.toObject(), duration };
      })
      .filter(Boolean);

    console.log(
      `✅ ${tripsWithDuration.length} upcoming trips remain after filtering.`
    );

    if (!tripsWithDuration.length) {
      console.log(
        "❌ No upcoming trips found for the selected cities/locations and date."
      );
      return res.status(404).json({
        success: false,
        message: "No upcoming trips found for the selected cities and date",
      });
    }

    console.log("📤 Sending response...");
    res.status(200).json({
      success: true,
      message: "Trips fetched successfully for selected cities and date",
      trips: tripsWithDuration,
    });
  } catch (error) {
    console.error("❌ Error fetching trips by cities and date:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching trips by cities and date",
      error: error.message,
    });
  }
};

exports.getTripsByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "An array of trip IDs is required",
      });
    }

    const now = new Date();

    const trips = await Promise.all(
      ids.map(async (id) => {
        const trip = await Trip.findById(id)
          .populate("seats")
          .populate("admin", "name email");

        if (!trip) return null;

        let duration = "Unknown";
        let departureDateTime = null;

        if (trip.takeoff?.date && trip.takeoff?.time) {
          try {
            // Combine date + time
            const takeoffDate = new Date(trip.takeoff.date);
            if (!isNaN(takeoffDate.getTime())) {
              const dateStr = takeoffDate.toISOString().split("T")[0];

              // Convert "09:00 PM" to 24h format for Date constructor
              let timeParts = trip.takeoff.time.match(/(\d+):(\d+)\s?(AM|PM)/i);
              let hours = 0,
                minutes = 0;
              if (timeParts) {
                hours = parseInt(timeParts[1], 10);
                minutes = parseInt(timeParts[2], 10);
                const period = timeParts[3].toUpperCase();
                if (period === "PM" && hours < 12) hours += 12;
                if (period === "AM" && hours === 12) hours = 0;
              }

              const tempDateTime = new Date(dateStr);
              tempDateTime.setHours(hours, minutes, 0, 0);

              if (!isNaN(tempDateTime.getTime())) {
                departureDateTime = tempDateTime.toISOString();
                const diffMs = tempDateTime.getTime() - now.getTime();

                if (diffMs <= 0) {
                  duration = "Departed";
                } else {
                  const hoursDiff = Math.floor(diffMs / (1000 * 60 * 60));
                  const minutesDiff = Math.floor(
                    (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                  );
                  duration = `${hoursDiff} hr${
                    hoursDiff !== 1 ? "s" : ""
                  } ${minutesDiff} min${minutesDiff !== 1 ? "s" : ""}`;
                }
              }
            }
          } catch (err) {
            duration = "Unknown";
          }
        }

        console.log(departureDateTime, "departureDateTime");
        return {
          ...trip.toObject(),
          duration: departureDateTime,
          departureDateTime,
        };
      })
    );

    const validTrips = trips.filter((t) => t !== null);

    if (!validTrips.length) {
      return res.status(404).json({
        success: false,
        message: "No valid trips found for the provided IDs",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trips fetched successfully",
      trips: validTrips,
    });
  } catch (error) {
    console.error("❌ Error fetching trips by IDs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching trips by IDs",
      error: error.message,
    });
  }
};

exports.getAllUserBookings = async (req, res) => {
  try {
    const bookingsData = await Booking.find()
      .populate("userId", "name email")
      .populate({
        path: "tripId",
        populate: { path: "admin", select: "name email" },
      })
      .populate("seatId", "position");

    const now = new Date();

    const bookings = bookingsData
      .filter((b) => b.userId && b.tripId && b.seatId)
      .map((b) => {
        // Determine actual departure time
        let departureDateTime = null;

        if (b.tripId.takeoff?.date) {
          departureDateTime = new Date(b.tripId.takeoff.date);

          // Use takeoff.time or fallback to departureTime
          const timeStr = b.tripId.takeoff.time || b.tripId.departureTime;
          if (timeStr) {
            const timeParts = timeStr.match(/(\d+):(\d+)\s?(AM|PM)/i);
            if (timeParts) {
              let hours = parseInt(timeParts[1], 10);
              const minutes = parseInt(timeParts[2], 10);
              const period = timeParts[3]?.toUpperCase();
              if (period === "PM" && hours < 12) hours += 12;
              if (period === "AM" && hours === 12) hours = 0;
              departureDateTime.setHours(hours, minutes, 0, 0);
            }
          }
        }

        const status =
          departureDateTime && now >= departureDateTime
            ? "finished"
            : "scheduled";

        return {
          bookingCode: b.bookingCode,
          passenger: b.userId.name,
          passengerEmail: b.userId.email,
          route: `${b.tripId.pickup.city} → ${b.tripId.dropoff.city}`,
          seatId: b.seatId._id,
          seatPosition: b.seatId.position,
          amount: b.amount,
          status,
          date: departureDateTime,
          tripDetails: b.tripId,
        };
      });

    res.status(200).json({
      success: true,
      message: "All user bookings fetched successfully",
      bookings,
    });
  } catch (error) {
    console.error("❌ Error fetching all user bookings:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching all user bookings",
      error: error.message,
    });
  }
};
