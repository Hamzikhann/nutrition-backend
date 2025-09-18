const router = require("express").Router();
const mealPlanerController = require("./mealPlaner.controller");

router.post("/create", (req, res) => {
	mealPlanerController.create(req, res);
});

router.post("/list", (req, res) => {
	mealPlanerController.list(req, res);
});

module.exports = router;
