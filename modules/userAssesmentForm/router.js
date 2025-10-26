"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("userAssesmentForm");
const userAssesmentFormController = require("./userAssesmentForm.controller");

router.post("/create", upload.array("media"), (req, res) => {
	userAssesmentFormController.create(req, res);
});

router.post("/update", (req, res) => {
	userAssesmentFormController.update(req, res);
});

router.post("/update/files", upload.array("media"), (req, res) => {
	userAssesmentFormController.updateFiles(req, res);
});

module.exports = router;
