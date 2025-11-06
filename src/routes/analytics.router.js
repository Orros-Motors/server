const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");


router.get(
  "/trips/status",

  analyticsController.getTripsCountByStatus
);

router.get(
  "/trips/booked-seats",

  analyticsController.getBookedSeatsCount
);

router.get(
  "/trips/by-day",

  analyticsController.getTripsCountByDay
);

router.get("/overall", analyticsController.getOverallAnalytics);

module.exports = router;
