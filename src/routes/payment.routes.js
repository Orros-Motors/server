const express = require("express");
const router = express.Router();
const axios = require("axios");
const nodemailer = require("nodemailer");
const { Seat } = require("../models/seat.model");
const { Payment } = require("../models/payment.model");
const { Booking } = require("../models/booking.model");
const { User } = require("../models/user.model");
const { Trip } = require("../models/trip.model");

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const appName = "Orro Motors";
const primaryBlue = "#0B63FF";
const lightGray = "#f9f9f9";
const borderGray = "#e0e0e0";
const textGray = "#555555";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/create-paystack-payment", async (req, res) => {
  console.log("CREATE PAYMENT] R¸oute hit");

  try {
    const { email, amount, seatIds, tripId, callback_url } = req.body;

    console.log(seatIds, "seatIdsseatIds");
    if (
      !email ||
      !amount ||
      !tripId ||
      !Array.isArray(seatIds) ||
      seatIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: amount * 100,
        metadata: { seatIds, tripId },
        callback_url,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = paystackResponse.data.data;
    const callbackUrlWithReference = `${callback_url}&reference=${data.reference}`;

    const payment = new Payment({
      email,
      seatIds,
      tripId,
      amount,
      reference: data.reference,
      authorizationUrl: data.authorization_url,
      status: "pending",
    });

    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      authorizationUrl: data.authorization_url,
      reference: data.reference,
      callbackUrl: callbackUrlWithReference,
    });
  } catch (error) {
    console.log(
      "ERROR IN CREATE PAYMENT]",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
});

// VERIFY PAYMENT + SEND PROFESSIONAL EMAIL (BEAUTIFULLY STYLED)
router.post("/verify-payment", async (req, res) => {
  try {
    const { email, reference } = req.body;

    // 1. Validate input
    if (!reference || !email) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing required parameters: email or reference",
        });
    }

    // 2. Verify payment with Paystack
    const verifyResponse = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const paymentData = verifyResponse.data.data;

    if (paymentData.status !== "success") {
      await Payment.findOneAndUpdate(
        { reference },
        { status: "failed", gatewayResponse: paymentData.gateway_response },
        { new: true }
      );
      return res
        .status(400)
        .json({ success: false, message: "Payment failed" });
    }

    // 3. Extract seatIds from metadata
    const seatIds = paymentData?.metadata?.seatIds;
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No seats selected" });
    }

    console.log("Verifying payment for seatIds:", seatIds);

    // 4. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 5. Find trip
    const tripId = paymentData.metadata.tripId;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    // 6. Process each seat: validate, check duplicates, ensure position
    const bookings = [];
    const processedSeatIds = new Set();

    for (const seatId of seatIds) {
      // Prevent duplicate seatId in same request
      if (processedSeatIds.has(seatId)) {
        throw new Error(`Duplicate seatId ${seatId} in request`);
      }
      processedSeatIds.add(seatId);

      // --- Find seat ---
      const seat = await Seat.findById(seatId);
      if (!seat) {
        throw new Error(`Seat not found: ${seatId}`);
      }

      // --- Check if seat already has a booking ---
      const existingBooking = await Booking.findOne({ seatId });
      if (existingBooking) {
        throw new Error(
          `Seat ${seat.position || seatId} is already booked (Code: ${
            existingBooking.bookingCode
          })`
        );
      }

      // --- Enforce: seat must have a position ---
      if (!seat.position) {
        throw new Error(
          `Seat ${seatId} is missing a position. Cannot create booking.`
        );
      }

 
      if (seat.isPaid || seat.isBooked || seat.isBooking) {
        throw new Error(
          `Seat ${seat.position} is no longer available (already reserved or paid)`
        );
      }

      // --- Generate unique booking code ---
      const bookingCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      // --- Update seat atomically ---
      const updatedSeat = await Seat.findByIdAndUpdate(
        seatId,
        {
          isPaid: true,
          isBooked: true,
          isBooking: true,
          bookingCode,
          bookedBy: user._id,
          bookingBy: user._id,
          paidBy: user._id,
        },
        { new: true }
      );

      if (!updatedSeat) {
        throw new Error(`Failed to update seat ${seatId}`);
      }

      // --- Create booking (only if all checks pass) ---
      const amountPerSeat = paymentData.amount / 100 / seatIds.length;

      const booking = await Booking.create({
        bookingCode,
        userId: user._id,
        seatId,
        amount: amountPerSeat,
        tripId,
        paymentReference: reference,
        position: seat.position, // Guaranteed to exist
      });

      bookings.push({
        bookingCode: booking.bookingCode,
        seatPosition: seat.position,
        amount: amountPerSeat,
      });
    }

    // 7. Update payment record
    await Payment.findOneAndUpdate(
      { reference },
      { status: "success", metadata: paymentData, seatIds },
      { new: true, upsert: true }
    );

    // 8. Prepare email
    const totalAmount = paymentData.amount / 100;
    const departureDate = new Date(trip.takeoff.date).toLocaleDateString(
      "en-GB",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - ${appName}</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background-color: ${primaryBlue}; padding: 30px 20px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 30px; color: ${textGray}; }
          .greeting { font-size: 18px; margin-bottom: 20px; }
          .section { margin-bottom: 25px; }
          .section h3 { color: ${primaryBlue}; margin: 0 0 15px 0; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid ${borderGray}; }
          th { background-color: ${lightGray}; font-weight: bold; color: #333; }
          .total-row { font-weight: bold; font-size: 18px; background-color: ${lightGray}; }
          .highlight { background-color: #e8f0ff; }
          .footer { background-color: ${lightGray}; padding: 25px; text-align: center; color: #777; font-size: 14px; }
          .btn { display: inline-block; background-color: ${primaryBlue}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
            .header { padding: 20px; }
            .header h1 { font-size: 24px; }
            .content { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${user.name || "Valued Customer"},</p>
            <p>Thank you for choosing <strong>${appName}</strong>. Your payment has been successful and your seats are now reserved.</p>

            <div class="section">
              <h3>Trip Details</h3>
              <table>
                <tr><th>Trip Name</th><td>${trip.tripName}</td></tr>
                <tr><th>From</th><td>${trip.pickup.city} → ${
      trip.pickup.location
    }</td></tr>
                <tr><th>To</th><td>${trip.dropoff.city} → ${
      trip.dropoff.location
    }</td></tr>
                <tr><th>Departure</th><td>${
                  trip.takeoff.time
                } • ${departureDate}</td></tr>
                <tr><th>Arrival</th><td>${trip.arrivalTime} (next day)</td></tr>
                <tr><th>Bus</th><td>${trip.bus}</td></tr>
              </table>
            </div>

            <div class="section">
              <h3>Your Seats & Booking Codes</h3>
              <table>
                <thead>
                  <tr>
                    <th>Seat No.</th>
                    <th>Booking Code</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${bookings
                    .map(
                      (b) => `
                    <tr class="highlight">
                      <td><strong>${b.seatPosition}</strong></td>
                      <td><strong style="font-size: 16px; letter-spacing: 1px;">${
                        b.bookingCode
                      }</strong></td>
                      <td>₦${b.amount.toLocaleString()}</td>
                    </tr>`
                    )
                    .join("")}
                  <tr class="total-row">
                    <td colspan="2"><strong>Total Paid</strong></td>
                    <td><strong>₦${totalAmount.toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <p><strong>Payment Reference:</strong> ${reference}</p>
              <p><strong>Transaction Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="text-align: center;">
              <a href="https://orromotors.com/my-bookings" class="btn">View All Bookings</a>
            </div>

            <div class="section">
              <p><strong>Important:</strong> Please arrive 30 minutes before departure. Show your booking code at the terminal.</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>${appName}</strong> • Safe. Reliable. Comfortable.</p>
            <p>Need help? Reply to this email or call <strong>0800-ORRO-NOW</strong></p>
            <p>&copy; 2025 ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 9. Send confirmation email
    await transporter.sendMail({
      from: `"${appName}" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Booking Confirmed! ${bookings.length} Seat${
        bookings.length > 1 ? "s" : ""
      } Reserved`,
      html: emailHTML,
    });

    console.log(
      `Email sent to ${user.email} with ${bookings.length} booking(s)`
    );

    // 10. Success response
    res.status(200).json({
      success: true,
      message:
        "Payment verified, bookings created, and confirmation email sent",
      bookings,
      trip,
      emailSent: true,
    });
  } catch (error) {
    console.error("ERROR IN VERIFY PAYMENT:", error.message || error);

    // Optional: Mark payment as failed if not already done
    try {
      await Payment.findOneAndUpdate(
        { reference: req.body.reference },
        { status: "failed", gatewayResponse: error.message },
        { new: true }
      );
    } catch (updateErr) {
      console.error("Failed to mark payment as failed:", updateErr);
    }

    res.status(400).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
});

// GET USER BOOKINGS (unchanged)
router.get("/trips/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const bookings = await Booking.find({ userId })
      .populate("tripId")
      .populate("seatId");

    const bookingData = bookings.map((b) => ({
      bookingCode: b.bookingCode,
      amount: b.amount,
      paymentReference: b.paymentReference,
      position: b.seatId?.position || "N/A",
      seat: b.seatId,
      trip: b.tripId,
      createdAt: b.createdAt,
    }));

    res.status(200).json({ success: true, bookings: bookingData });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
      error: error.message,
    });
  }
});

module.exports = router;
