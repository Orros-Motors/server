const { Admin } = require("../models/admin.model");
const { AdminOtp } = require("../models/adminOtp.model");
const jwt = require("jsonwebtoken");
const { sendOTP, generateOTP } = require("../utils/generate_and_send_otp");
const { Trip } = require("../models/trip.model");

exports.registerAdmin = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone || !email)
      return res.status(400).json({ success: false, message: "All fields are required" });

    const existing = await Admin.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "Admin already exists" });

    const admin = await Admin.create({ name, phone, email });
    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      admin,
    });
  } catch (error) {
    console.error("❌ Error registering admin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email is required" });

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    const otp = generateOTP();
    await AdminOtp.deleteMany({ email });
    await AdminOtp.create({ email, otp });
    await sendOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent to admin email successfully",
    });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: "Email and OTP are required" });

    const validOtp = await AdminOtp.findOne({ email, otp });
    if (!validOtp)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    await AdminOtp.deleteMany({ email });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin,
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({
      success: true,
      message: "Admins fetched successfully",
      admins,
    });
  } catch (error) {
    console.error("❌ Error fetching admins:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    res.status(200).json({
      success: true,
      message: "Admin fetched successfully",
      admin,
    });
  } catch (error) {
    console.error("❌ Error fetching admin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);

    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting admin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getTripsByAdmin = async (req, res) => {
    try {
      const { id } = req.params; 
      console.log(id, 'id')
      if (!id)
        return res
          .status(400)
          .json({ success: false, message: "Admin ID is required" });
  
      const trips = await Trip.find({ admin: id })
        .populate("bus")
        .populate("seats");
  
      res.status(200).json({
        success: true,
        message: "Trips fetched successfully",
        trips,
      });
    } catch (error) {
      console.error("❌ Error fetching trips:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };