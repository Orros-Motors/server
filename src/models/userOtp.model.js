const mongoose = require("mongoose");

const userOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }, 
  },
  { timestamps: true }
);

const UserOtp = mongoose.model("UserOtp", userOtpSchema);
module.exports = { UserOtp };