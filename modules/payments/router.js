const express = require("express");
const router = express.Router();
const paymnetController = require("./payment.controller");
const fileUpload = require("../../utils/fileUpload");

const { upload } = fileUpload("paymnets");

router.post("/create", upload.single("image"), paymnetController.create);

module.exports = router;
