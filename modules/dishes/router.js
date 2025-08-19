const router = require("express").Router();
const dishesController = require("./dishes.controller");
const fileUpload = require("../../utils/fileUpload");

const { upload } = fileUpload("dishes");

router.post("/create", upload.single("image"), async (req, res) => {
	if (req.role == "Administrator") {
		await dishesController.create(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to create a dish"
		});
	}
});

router.post("/list", async (req, res) => {
	await dishesController.list(req, res);
});

module.exports = router;
