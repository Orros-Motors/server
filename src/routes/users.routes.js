const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyAdminToken } = require("../utils/verify_token");

// OTP login
router.post("/send-otp", userController.sendUserOtp);
router.post("/verify-otp", userController.verifyUserOtp);

// Protected routes
router.get("/users", verifyAdminToken, userController.getAllUsers);
router.get("/a-user/", userController.getUserById);

router.post("/trips", userController.getTripsByUser);

module.exports = router;
