// controllers/user.controller.js
const { User } = require("../models/user.model");
const { UserOtp } = require("../models/userOtp.model");
const jwt = require("jsonwebtoken");
const { sendOTP, generateOTP } = require("../utils/generate_and_send_otp");
const { Trip } = require("../models/trip.model");

exports.sendUserOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    let user = await User.findOne({ email });
    if (!user) user = await User.create({ email, name });

    const otp = generateOTP();
    await UserOtp.deleteMany({ email });
    await UserOtp.create({ email, otp });

    await sendOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to user email",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.verifyUserOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });

    const validOtp = await UserOtp.findOne({ email, otp });
    if (!validOtp)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET_USER,
      { expiresIn: "3h" }
    );

    await UserOtp.deleteMany({ email });

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
    });
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

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTripsByUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.id; 
    if (!userId)
      return res.status(400).json({ success: false, message: "User ID is required" });

    const trips = await Trip.find({ bookedBy: userId }).populate("seats");

    res.status(200).json({
      success: true,
      message: "Trips fetched successfully",
      trips,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};