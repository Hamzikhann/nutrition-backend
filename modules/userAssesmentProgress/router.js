const express = require("express");
const router = express.Router();
const userAssesmentProgressController = require("./userAssesmentProgress.controller");

// Routes for user assessment progress
router.post("/create", userAssesmentProgressController.createProgress);
router.post("/list", userAssesmentProgressController.getUserProgress);
router.post("/detail", userAssesmentProgressController.getProgressById);
router.post("/update", userAssesmentProgressController.updateProgress);

module.exports = router;
