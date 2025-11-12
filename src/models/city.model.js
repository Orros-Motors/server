const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: "Nigeria",
    },
    terminal: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const City = mongoose.model("City", citySchema);
module.exports = { City };
