const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);
router.post("/verify-otp", adminController.verifyOtp);
router.post("/resend-otp", adminController.resendOtp);
router.get("/get/", adminController.getAllAdmins);
router.get("/get/:id", adminController.getAdminById);
router.delete("/delete/:id", adminController.deleteAdmin);
router.get("/by-admin/:id", adminController.getTripsByAdmin);

module.exports = router;
