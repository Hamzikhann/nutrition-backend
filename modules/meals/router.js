const router = require("express").Router();
const mealsController = require("./meals.controller");
const fileUpload = require("../../utils/fileUpload");

const { upload } = fileUpload("meals");

router.post("/create", upload.single("image"), async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await mealsController.create(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to create a meal plan"
		});
	}
});

router.post("/list", async (req, res) => {
	await mealsController.list(req, res);
});

router.post("/update", upload.single("image"), async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await mealsController.update(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to update a meal plan"
		});
	}
});

router.post("/delete", async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await mealsController.delete(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to delete a meal plan"
		});
	}
});

module.exports = router;
