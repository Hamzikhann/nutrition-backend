"use strict";
const express = require("express");
const router = express.Router();
const habitsController = require("./habits.controller");
const jwt = require("../../utils/jwt");
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("habits");

router.post("/create", upload.single("image"), async (req, res) => {
	await habitsController.create(req, res);
});
// router.post("/list", async (req, res) => {
// 	await habitsController.list(req, res);
// });
router.post("/list", async (req, res) => {
	await habitsController.listv2(req, res);
});

router.post("/detail", async (req, res) => {
	await habitsController.detail(req, res);
});
router.post("/update", async (req, res) => {
	if (req.role == "Administrator") {
		await habitsController.update(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to perform this action"
		});
	}
});
router.post("/delete", async (req, res) => {
	if (req.role == "Administrator") {
		await habitsController.delete(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to perform this action"
		});
	}
});
router.post("/update/status", async (req, res) => {
	if (req.role == "User") await habitsController.updateStatus(req, res);
	else
		return res.status(400).send({
			message: "You are not authorized to perform this action"
		});
});

//
module.exports = router;
