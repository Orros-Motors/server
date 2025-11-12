const { Seat } = require("../models/seat.model");
const nodemailer = require("nodemailer");
const { User } = require("../models/user.model");

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
      return res
        .status(404)
        .json({ success: false, message: "Seat not found" });
    }

    if (seat.isBooking) {
      return res
        .status(400)
        .json({ success: false, message: "Seat is already being booked" });
    }

    seat.isBooking = true;
    seat.bookedBy = userId;
    await seat.save();

    res
      .status(200)
      .json({ success: true, message: "Seat booking in progress", seat });
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
      return res
        .status(404)
        .json({ success: false, message: "Seat not found" });
    }

    seat.isBooking = false;
    seat.isBooked = true;
    seat.bookedBy = userId;
    await seat.save();

    res
      .status(200)
      .json({ success: true, message: "Seat booked successfully", seat });
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
      return res
        .status(404)
        .json({ success: false, message: "Seat not found" });
    }

    seat.isPaid = true;
    seat.paidBy = userId;
    await seat.save();

    res
      .status(200)
      .json({ success: true, message: "Seat payment confirmed", seat });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get available seats for a trip
exports.getAvailableSeats = async (req, res) => {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const seats = await Seat.find({ trip: tripId, isBooked: false }).sort({
      position: 1,
    });

    res
      .status(200)
      .json({ success: true, message: "Available seats fetched", seats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Check booking status for multiple seats
exports.checkSeatsStatus = async (req, res) => {
  try {
    const { seatIds } = req.body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "seatIds array is required" });
    }

    // Run checks in parallel
    const seatStatuses = await Promise.all(
      seatIds.map(async (seatId) => {
        const seat = await Seat.findById(seatId).select(
          "_id position isBooked isBooking"
        );
        if (!seat) {
          return {
            seatId,
            position: null,
            isBooked: null,
            isBooking: null,
            message: "Seat not found",
          };
        }
        return {
          seatId: seat._id,
          position: seat.position,
          isBooked: seat.isBooked,
          isBooking: seat.isBooking,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Seat statuses fetched successfully",
      seats: seatStatuses,
    });
  } catch (error) {
    console.error("checkSeatsStatus error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};


// ✅ Helper function to send styled email
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Zaeda Transport" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Error sending email:", err);
  }
};

// ✅ Helper function to build styled reminder email
const buildReminderEmail = (userName, minutesLeft) => {
  return `
    <div style="font-family:Arial,sans-serif;padding:20px;background-color:#f9f9f9;">
      <div style="max-width:600px;margin:auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color:#0056b3;text-align:center;">Payment Reminder</h2>
        <p style="font-size:16px;color:#333;">Dear ${userName},</p>
        <p style="font-size:15px;color:#555;">
          You have a pending seat booking that has not been paid for yet.
          Please complete your payment within the next <b>${minutesLeft} minutes</b> 
          to secure your seat. 
        </p>
        <p style="font-size:15px;color:#555;">
          If payment is not completed within 30 minutes, your seat will be released automatically.
        </p>
        <div style="text-align:center;margin-top:20px;">
          <a href="${process.env.CLIENT_URL}/payment" 
             style="background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;">
             Complete Payment Now
          </a>
        </div>
        <p style="margin-top:30px;font-size:13px;color:#888;">Zaeda Transport — Your comfort, our priority.</p>
      </div>
    </div>
  `;
};


exports.toggleMultipleBooking = async (req, res) => {
  try {
    const { seatIds } = req.body;
    const userId = req.user.id;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "seatIds array is required" });
    }


    const user = await User.findById(userId).select("email name");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const results = await Promise.all(
      seatIds.map(async (seatId) => {
        const seat = await Seat.findById(seatId);
        if (!seat) {
          return { seatId, success: false, message: "Seat not found" };
        }

        // Prevent toggling if already booked
        if (seat.isBooked) {
          return { seatId, success: false, message: "Seat already booked" };
        }

        seat.isBooking = true;
        seat.bookedBy = userId;
        await seat.save();

        // --- Schedule Email Reminders and Auto-Unbook ---
        const seatIdentifier = seat._id.toString();

        // After 10 minutes → Send first reminder
        setTimeout(async () => {
          const checkSeat = await Seat.findById(seatIdentifier);
          if (checkSeat && !checkSeat.isPaid && checkSeat.isBooking) {
            await sendEmail(
              user.email,
              "Payment Reminder - 20 minutes remaining",
              buildReminderEmail(user.name || "Customer", 20)
            );
            console.log(
              `🔔 Sent 10-min reminder to ${user.email} for seat ${seatIdentifier}`
            );
          }
        }, 10 * 60 * 1000);

        // After 20 minutes → Send second reminder
        setTimeout(async () => {
          const checkSeat = await Seat.findById(seatIdentifier);
          if (checkSeat && !checkSeat.isPaid && checkSeat.isBooking) {
            await sendEmail(
              user.email,
              "Final Payment Reminder - 10 minutes remaining",
              buildReminderEmail(user.name || "Customer", 10)
            );
            console.log(
              `🔔 Sent 20-min reminder to ${user.email} for seat ${seatIdentifier}`
            );
          }
        }, 20 * 60 * 1000);

        // After 30 minutes → Auto-unbook if unpaid
        setTimeout(async () => {
          const checkSeat = await Seat.findById(seatIdentifier);
          if (checkSeat && !checkSeat.isPaid && checkSeat.isBooking) {
            checkSeat.isBooking = false;
            checkSeat.bookedBy = null;
            await checkSeat.save();

            await sendEmail(
              user.email,
              "Booking Cancelled - Payment Timeout",
              `
              <div style="font-family:Arial,sans-serif;padding:20px;background-color:#f9f9f9;">
                <div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                  <h2 style="color:#d9534f;text-align:center;">Booking Cancelled</h2>
                  <p style="font-size:16px;color:#333;">Dear ${
                    user.name || "Customer"
                  },</p>
                  <p style="font-size:15px;color:#555;">
                    Unfortunately, your seat reservation has been cancelled because payment was not completed within the 30-minute window.
                  </p>
                  <p style="font-size:15px;color:#555;">
                    You can always rebook your seat anytime through our platform.
                  </p>
                  <div style="text-align:center;margin-top:20px;">
                    <a href="${process.env.CLIENT_URL}/bookings" 
                      style="background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;">
                      Rebook Your Seat
                    </a>
                  </div>
                </div>
              </div>
              `
            );

            console.log(
              `❌ Auto-unbooked seat ${seatIdentifier} due to payment timeout.`
            );
          }
        }, 30 * 60 * 1000);

        return {
          seatId: seat._id,
          position: seat.position,
          isBooking: seat.isBooking,
          success: true,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Seats updated to isBooking = true. Reminder emails scheduled.",
      results,
    });
  } catch (error) {
    console.error("toggleMultipleBooking error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
