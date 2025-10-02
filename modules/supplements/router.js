const router = require("express").Router();
const supplementsController = require("./supplements.controller");
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("habits");

router.post("/create", upload.single("image"), (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") supplementsController.create(req, res);
	else
		return res.status(401).send({
			message: "You are not authorized to perform this action"
		});
});

router.post("/create/category", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
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

router.post("/assigned/supplements", (req, res) => {
	if (req.role != "Administrator" || req.role == "Subadmin")
		return res.status(401).send({
			message: "You are not authorized to perform this action"
		});

	supplementsController.assignSupplementToCategory(req, res);
});

router.post("/update", upload.single("image"), (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") supplementsController.update(req, res);
	else
		return res.status(401).send({
			message: "You are not authorized to perform this action"
		});
});

router.post("/delete", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") supplementsController.delete(req, res);
	else
		return res.status(401).send({
			message: "You are not authorized to perform this action"
		});
});

module.exports = router;
