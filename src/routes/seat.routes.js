const express = require("express");
const router = express.Router();
const seatController = require("../controllers/seat.controller");
const { verifyUserToken } = require("../utils/verify_token");

router.post("/book", verifyUserToken, seatController.bookSeat);
router.post("/confirm", verifyUserToken, seatController.confirmBooking);
router.post("/pay", verifyUserToken, seatController.markPaid);
router.get("/available", seatController.getAvailableSeats);
router.post(
  "/check-seat-status",
  verifyUserToken,
  seatController.checkSeatsStatus
);
router.post("/is-booking", seatController.toggleMultipleBooking);
//checkSeatsStatus
module.exports = router;
