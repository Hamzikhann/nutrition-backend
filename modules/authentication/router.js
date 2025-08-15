"use strict";

const express = require("express");
const router = express.Router();
const jwt = require("../../utils/jwt");

const authcontroller = require("./authentication.controller");

router.post("/login", authcontroller.login);
router.post("/signup", (req, res) => {
	authcontroller.signup(req, res);
});
router.post("/forgot/password", authcontroller.forgotPassword);
router.post("/send/otp", authcontroller.sendOtp);
router.post("/reset/password", jwt.protect, authcontroller.resetPassword);
router.post("/check", authcontroller.checkEmail);
router.post("/verify/otp", authcontroller.verifyOtp);

module.exports = router;
