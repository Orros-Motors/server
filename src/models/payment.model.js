const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  seat: { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: false },

  email: { type: String, required: true },
  amount: { type: Number, required: true },
  reference: { type: String, required: true },
  authorizationUrl: { type: String },
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },
  metadata: { type: Object },
});

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = { Payment };
