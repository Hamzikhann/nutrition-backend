"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("userAssesmentForm");
const userAssesmentFormController = require("./userAssesmentForm.controller");

router.post("/create", upload.array("media"), (req, res) => {
	console.log(req.files);
	userAssesmentFormController.create(req, res);
});

// router.post("/list", userAssesmentFormController.list);

router.post("/update", (req, res) => {
	userAssesmentFormController.update(req, res);
});

router.post("/update/files", upload.array("media"), (req, res) => {
	userAssesmentFormController.updateFiles(req, res);
});

router.post("/assigned-meals", (req, res) => {
	userAssesmentFormController.getAssignedMeals(req, res);
});

module.exports = router;
