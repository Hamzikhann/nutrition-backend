"use strict";

const express = require("express");
const router = express.Router();
const fileUplod = require("../../utils/fileUpload");
const { upload } = fileUplod("exerciseVideoes");
const exerciseController = require("./exercise.controller");

router.post("/create", upload.single("video"), (req, res) => {
	if (req.role == "Administrator") {
		exerciseController.create(req, res);
	} else {
		return res.status(403).send({
			message: "You are not authorized to perform this action"
		});
	}
});

router.post("/list", (req, res) => {
	if (req.role == "Administrator") {
		exerciseController.list(req, res);
	} else {
		return res.status(403).send({
			message: "You are not authorized to perform this action"
		});
	}
});

module.exports = router;
