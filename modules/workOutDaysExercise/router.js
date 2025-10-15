"use strict";

const express = require("express");
const router = express.Router();
const workoutDayExercisesController = require("./workOutDaysExercise.controller");

router.post("/create", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		workoutDayExercisesController.create(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can create workout day exercises"
		});
	}
});

router.post("/list", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		workoutDayExercisesController.listofAdmin(req, res);
	} else {
		workoutDayExercisesController.list(req, res);
	}
});

router.post("/detail", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		workoutDayExercisesController.detail(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can list weekId"
		});
	}
});

router.post("/list/weeks", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		workoutDayExercisesController.listWeeks(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can list weeks"
		});
	}
});

router.post("/list/workoutdays", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		workoutDayExercisesController.listWorkOutDays(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can list work out days"
		});
	}
});

router.post("/update/status", (req, res) => {
	console.log("role", req.role);
	if (req.role == "User") {
		workoutDayExercisesController.updateStatus(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to update the status"
		});
	}
});

router.post("/create/week", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		workoutDayExercisesController.createWeek(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can create week"
		});
	}
});

router.post("/delete", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		workoutDayExercisesController.delete(req, res);
	} else {
		return res.status(400).send({
			message: "Only Administrator can create week"
		});
	}
});

module.exports = router;
