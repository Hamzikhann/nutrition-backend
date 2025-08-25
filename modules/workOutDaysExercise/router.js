"use strict";

const express = require("express");
const router = express.Router();
const workoutDayExercisesController = require("./workOutDaysExercise.controller");

router.post("/create", (req, res) => {
	if (req.role == "Administrator") {
		workoutDayExercisesController.create(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can create workout day exercises"
		});
	}
});

router.post("/list", (req, res) => {
	workoutDayExercisesController.list(req, res);
});

router.post("/list/weeks", (req, res) => {
	if (req.role == "Administrator") {
		workoutDayExercisesController.listWeeks(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can list weeks"
		});
	}
});

router.post("/list/workoutdays", (req, res) => {
	if (req.role == "Administrator") {
		workoutDayExercisesController.listWorkOutDays(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can list work out days"
		});
	}
});

module.exports = router;
