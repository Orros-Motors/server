const express = require("express");
const router = express.Router();
const tripController = require("../controllers/trip.controller");
const { verifyAdminToken } = require("../utils/verify_token");

router.post("/create-new-trip", tripController.createTrip);
router.put(
  "/update-trip-details/",

  tripController.updateTrip
);
router.delete("/delete/", tripController.deleteTrip);
router.get("/fetch-trip/", tripController.getTripById);
router.get("/fetch-all-trips", tripController.getAllTrips);
router.get("/fetch-all-by-status", tripController.getTripsByStatus);
router.get("/search", tripController.searchTrips);
router.post("/search-trips", tripController.getTripsByCitiesAndDate);
router.post("/search-trips-by-id", tripController.getTripsByIds);
router.get("/bookings", tripController.getAllUserBookings);


//getAllUserBookings
//search-trips
module.exports = router;
