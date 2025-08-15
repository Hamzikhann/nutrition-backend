"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("highlights");
const highlightsController = require("./highlights.controller");

// Create highlight with file upload
router.post("/create", upload.single("media"), (req, res) => {
	if (req.role === "Administrator") {
		highlightsController.create(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

// Get all highlights
router.post("/list", highlightsController.list);
router.post("/create/items", upload.single("media"), (req, res) => {
	if (req.role == "Administrator") {
		highlightsController.createHighlightItem(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

module.exports = router;
