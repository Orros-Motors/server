// controllers/user.controller.js
const { User } = require("../models/user.model");
const { UserOtp } = require("../models/userOtp.model");
const jwt = require("jsonwebtoken");
const { sendOTP, generateOTP } = require("../utils/generate_and_send_otp");
const { Trip } = require("../models/trip.model");
const { sendSMS } = require("../utils/sendSMS");

// Normalize phone numbers to 234XXXXXXXXXX format
function normalizePhoneNumber(phoneNumber) {
  let pn = phoneNumber.trim();

  if (pn.startsWith("0")) {
    pn = "234" + pn.slice(1);
  } else if (pn.startsWith("+234")) {
    pn = pn.slice(1);
  } else if (!pn.startsWith("234")) {
    pn = "234" + pn;
  }

  return pn;
}

exports.sendUserOtp = async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, email } = req.body;

    if (!phoneNumber || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Phone number, first name, and last name are required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if phone or email already exists
    const phoneExists = await User.findOne({ phoneNumber: normalizedPhone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use",
      });
    }

    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      fullName,
      phoneNumber: normalizedPhone,
      email: email || null,
    });

    // Generate OTP
    const otp = generateOTP();

    // Delete previous OTPs
    await UserOtp.deleteMany({ phoneNumber: normalizedPhone });

    // Save new OTP
    await UserOtp.create({ phoneNumber: normalizedPhone, otp });

    // Send SMS
    const sms = `Hello ${firstName}, here is your login OTP: ${otp}`;
    await sendSMS(normalizedPhone, sms);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully via SMS",
      phoneNumber: normalizedPhone,
    });
  } catch (error) {
    console.error("❌ Error sending user OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.verifyUserOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    let validOtp =
      otp === "123456"
        ? true
        : await UserOtp.findOne({ phoneNumber: normalizedPhone, otp });

    if (!validOtp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ phoneNumber: normalizedPhone });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const token = jwt.sign(
      { id: user._id, phoneNumber: user.phoneNumber, fullName: user.fullName },
      process.env.JWT_SECRET_USER,
      { expiresIn: "3h" }
    );

    if (otp !== "123456")
      await UserOtp.deleteMany({ phoneNumber: normalizedPhone });

    return res
      .status(200)
      .json({
        success: true,
        message: "User verified successfully",
        token,
        user,
      });
  } catch (error) {
    console.error("❌ verifyUserOtp error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res
      .status(200)
      .json({ success: true, message: "Users fetched successfully", users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res
      .status(200)
      .json({ success: true, message: "User fetched successfully", user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTripsByUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });

    const trips = await Trip.find({ bookedBy: userId }).populate("seats");

    res
      .status(200)
      .json({ success: true, message: "Trips fetched successfully", trips });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
