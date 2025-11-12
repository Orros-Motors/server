const express = require("express");
const router = express.Router();
const cityController = require("../controllers/city.controller");


router.post("/add", cityController.createCities);
router.get("/", cityController.getAllCities);
router.put("/:id", cityController.updateCity);
router.delete("/:id", cityController.deleteCity);

module.exports = router;
