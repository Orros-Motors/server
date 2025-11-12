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

    // 1️⃣ Validate input
    if (!reference || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: email or reference",
      });
    }

    // 2️⃣ Verify payment with Paystack
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

    // 3️⃣ Extract seatIds
    const seatIds = paymentData?.metadata?.seatIds;
    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No seats selected" });
    }

    console.log("Verifying payment for seatIds:", seatIds);

    // 4️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 5️⃣ Find trip
    const tripId = paymentData.metadata.tripId;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    // 6️⃣ Process each seat
    const bookings = [];
    const processedSeatIds = new Set();

    for (const seatId of seatIds) {
      if (processedSeatIds.has(seatId)) {
        throw new Error(`Duplicate seatId ${seatId} in request`);
      }
      processedSeatIds.add(seatId);

      const seat = await Seat.findById(seatId);
      if (!seat) throw new Error(`Seat not found: ${seatId}`);

      const existingBooking = await Booking.findOne({ seatId });
      if (existingBooking) {
        throw new Error(
          `Seat ${seat.position || seatId} is already booked (Code: ${
            existingBooking.bookingCode
          })`
        );
      }

      if (!seat.position) {
        throw new Error(`Seat ${seatId} has no position defined`);
      }

      if (seat.isPaid || seat.isBooked || seat.isBooking) {
        throw new Error(`Seat ${seat.position} is no longer available`);
      }

      // Generate booking code
      const bookingCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      // Update seat
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

      if (!updatedSeat) throw new Error(`Failed to update seat ${seatId}`);

      // Create booking record
      const amountPerSeat = paymentData.amount / 100 / seatIds.length;
      const booking = await Booking.create({
        bookingCode,
        userId: user._id,
        seatId,
        amount: amountPerSeat,
        tripId,
        paymentReference: reference,
        position: seat.position,
      });

      bookings.push({
        bookingCode: booking.bookingCode,
        seatPosition: seat.position,
        amount: amountPerSeat,
      });
    }

    // 7️⃣ Update payment record
    await Payment.findOneAndUpdate(
      { reference },
      { status: "success", metadata: paymentData, seatIds },
      { new: true, upsert: true }
    );

    // 8️⃣ Prepare email HTML
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
        <title>Booking Confirmed - ${appName}</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background-color: ${primaryBlue}; padding: 30px 20px; text-align: center; color: white; }
          .content { padding: 30px; color: ${textGray}; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid ${borderGray}; }
          th { background-color: ${lightGray}; font-weight: bold; color: #333; }
          .total-row { font-weight: bold; background-color: ${lightGray}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Booking Confirmed!</h1></div>
          <div class="content">
            <p>Hi ${user.name || "Valued Customer"},</p>
            <p>Thank you for choosing <strong>${appName}</strong>. Your payment has been confirmed and your seat(s) have been reserved.</p>
            <h3>Trip Details</h3>
            <table>
              <tr><th>Trip</th><td>${trip.tripName}</td></tr>
              <tr><th>From</th><td>${trip.pickup.city} → ${
      trip.pickup.location
    }</td></tr>
              <tr><th>To</th><td>${trip.dropoff.city} → ${
      trip.dropoff.location
    }</td></tr>
              <tr><th>Departure</th><td>${
                trip.takeoff.time
              } • ${departureDate}</td></tr>
            </table>
            <h3>Seats</h3>
            <table>
              <thead><tr><th>Seat</th><th>Code</th><th>Amount</th></tr></thead>
              <tbody>
                ${bookings
                  .map(
                    (b) => `
                  <tr>
                    <td>${b.seatPosition}</td>
                    <td><strong>${b.bookingCode}</strong></td>
                    <td>₦${b.amount.toLocaleString()}</td>
                  </tr>`
                  )
                  .join("")}
                <tr class="total-row"><td colspan="2">Total Paid</td><td>₦${totalAmount.toLocaleString()}</td></tr>
              </tbody>
            </table>
            <p>Payment Reference: ${reference}</p>
            <p>Transaction Time: ${new Date().toLocaleString()}</p>
            <p>Please arrive 30 minutes before departure and show your booking code at the terminal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 9️⃣ Attempt to send email (non-blocking)
    try {
      await transporter.sendMail({
        from: `"${appName}" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `Booking Confirmed! ${bookings.length} Seat${
          bookings.length > 1 ? "s" : ""
        } Reserved`,
        html: emailHTML,
      });
      console.log(`✅ Email sent to ${user.email}`);
    } catch (emailErr) {
      console.error("⚠️ Email sending failed:", emailErr.message);
      // Don't throw — still proceed
    }

    // 🔟 Final success response
    return res.status(200).json({
      success: true,
      message:
        "Payment verified, bookings created successfully (email attempt made)",
      bookings,
      trip,
    });
  } catch (error) {
    console.error("❌ ERROR IN VERIFY PAYMENT:", error.message || error);

    // Mark payment as failed if something goes wrong
    try {
      await Payment.findOneAndUpdate(
        { reference: req.body.reference },
        { status: "failed", gatewayResponse: error.message },
        { new: true }
      );
    } catch (updateErr) {
      console.error("Failed to mark payment as failed:", updateErr);
    }

    return res.status(400).json({
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
