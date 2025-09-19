const router = require("express").Router();
const supplementsController = require("./supplements.controller");
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("habits");

router.post("/create", upload.single("image"), (req, res) => {
	if (req.role == "Administrator") supplementsController.create(req, res);
	else
		return res.status(401).send({
			message: "You are not authorized to perform this action"
		});
});

router.post("/create/category", (req, res) => {
	if (req.role == "Administrator") {
		supplementsController.createCategory(req, res);
	} else {
		return res.status(401).send({
			message: "You are not authorized to perform this action"
		});
	}
});

router.post("/list", (req, res) => {
	supplementsController.list(req, res);
});

module.exports = router;
