const express = require("express");
const router = express.Router();
const howToUseController = require("./howTuUse.controller");
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("howToUse");

router.post("/list", howToUseController.list);
router.post("/create", upload.single("media"), (req, res) => {
	if (req.role == "Administrator") {
		howToUseController.create(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/create/category", (req, res) => {
	if (req.role == "Administrator") {
		howToUseController.createCategory(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/update", upload.single("media"), (req, res) => {
	if (req.role == "Administrator") {
		howToUseController.update(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});
router.post("/delete", (req, res) => {
	if (req.role == "Administrator") {
		howToUseController.delete(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

module.exports = router;
