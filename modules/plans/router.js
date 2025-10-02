"use strict";

const express = require("express");
const router = express.Router();
const plansControler = require("./plans.controller");
const jwt = require("../../utils/jwt");

router.post("/list", plansControler.list);
router.post("/create", jwt.protect, (req, res) => {
	console.log(req.role);
	if (req.role == "Administrator" || req.role == "Subadmin") plansControler.create(req, res);
	else
		return res.status(400).send({
			message: "Only Administrator can list weekId"
		});
});

router.post("/update", jwt.protect, (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") plansControler.update(req, res);
	else
		return res.status(400).send({
			message: "Only Administrator can list weekId"
		});
});

router.post("/delete", jwt.protect, (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") plansControler.delete(req, res);
	else
		return res.status(400).send({
			message: "Only Administrator can list weekId"
		});
});

module.exports = router;
