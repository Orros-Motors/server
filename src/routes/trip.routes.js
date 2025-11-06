const express = require("express");
const router = express.Router();
const tripController = require("../controllers/trip.controller");
const { verifyAdminToken } = require("../utils/verify_token");

router.post("/create-new-trip", verifyAdminToken, tripController.createTrip);
router.put(
  "/update-trip-details/",
  verifyAdminToken,
  tripController.updateTrip
);
router.delete("/delete/", verifyAdminToken, tripController.deleteTrip);
router.get("/fetch-trip/", tripController.getTripById);
router.get("/fetch-all-trips", tripController.getAllTrips);
router.get("/fetch-all-by-status", tripController.getTripsByStatus);
router.get("/search", tripController.searchTrips);
module.exports = router;
