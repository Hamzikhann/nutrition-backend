"use strict";
const express = require("express");
const router = express.Router();
const habitsController = require("./habits.controller");
const jwt = require("../../utils/jwt");

router.post("/create", async (req, res) => {
	await habitsController.create(req, res);
});
router.post("/list", async (req, res) => {
	await habitsController.list(req, res);
});
router.post("/detail", async (req, res) => {
	await habitsController.detail(req, res);
});
router.post("/update", async (req, res) => {
	await habitsController.update(req, res);
});
router.post("/delete", async (req, res) => {
	await habitsController.delete(req, res);
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
