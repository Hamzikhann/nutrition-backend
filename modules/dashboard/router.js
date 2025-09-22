"use strict";

const express = require("express");
const router = express.Router();
const dashboardController = require("./dashboard.controller");

// Get main dashboard statistics
router.post("/stats", (req, res) => {
	if (req.role === "Administrator") {
		dashboardController.getDashboardStats(req, res);
	} else {
		res.status(403).json({ message: "Forbidden Access" });
	}
});

// Get monthly user growth data
router.post("/user-growth", (req, res) => {
	if (req.role === "Administrator") {
		dashboardController.getMonthlyUserGrowth(req, res);
	} else {
		res.status(403).json({ message: "Forbidden Access" });
	}
});

// Get user activity statistics
router.post("/user-activity", (req, res) => {
	if (req.role === "Administrator") {
		dashboardController.getUserActivityStats(req, res);
	} else {
		res.status(403).json({ message: "Forbidden Access" });
	}
});

module.exports = router;
