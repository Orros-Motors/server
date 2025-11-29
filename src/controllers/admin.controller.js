const { Admin } = require("../models/admin.model");
const { AdminOtp } = require("../models/adminOtp.model");
const jwt = require("jsonwebtoken");
const { sendOTP, generateOTP } = require("../utils/generate_and_send_otp");
const { Trip } = require("../models/trip.model");
const { sendSMS } = require("../utils/sendSMS");

exports.registerAdmin = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone || !email)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    const existing = await Admin.findOne({ email });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Admin already exists" });

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
    console.log("➡️ loginAdmin triggered");
    console.log("📥 Request body:", req.body);

    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or Phone number is required",
      });
    }

    // Find Admin by email or phone
    const admin = await Admin.findOne({
      $or: [{ email }, { phone: phone }],
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const to = admin.phone;
    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Admin does not have a valid phone number",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Clear old OTPs
    await AdminOtp.deleteMany({
      email: admin.email,
    });

    // Save new OTP
    await AdminOtp.create({
      email: admin.email,
      otp,
    });
    const sms = `Hello, here is your ORRO Motors admin OTP: ${otp}`;
    // Send OTP via SMS
    await sendSMS(to, sms);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("❌ Error in loginAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================= VERIFY OTP =========================

exports.verifyOtp = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    if (!otp || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: "OTP and Email/Phone are required",
      });
    }

    // Find admin by email or phone
    const admin = await Admin.findOne({
      $or: [{ email }, { phone: phone }],
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check OTP
    let validOtp =
      otp === "123456"
        ? true
        : await AdminOtp.findOne({
            email: admin.email,
            otp,
          });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Generate Token
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Delete OTP unless master code
    if (otp !== "123456") {
      await AdminOtp.deleteMany({ email: admin.email });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin,
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========================= RESEND OTP =========================

exports.resendOtp = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or Phone number is required",
      });
    }

    const admin = await Admin.findOne({
      $or: [{ email }, { phone: phone }],
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const otp = generateOTP();

    await AdminOtp.deleteMany({ email: admin.email });

    await AdminOtp.create({ email: admin.email, otp });

    const sms = `Hello, here is your ORRO Motors admin OTP: ${otp}`;

    await sendSMS(admin.phone, sms);

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("❌ Error resending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
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
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

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
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

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
    console.log(id, "id");
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
