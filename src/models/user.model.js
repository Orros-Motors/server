const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: String,
    firstName: String,
    lastName: String,
    phone: String,
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = { User };
