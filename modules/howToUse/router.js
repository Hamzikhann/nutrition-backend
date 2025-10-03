const express = require("express");
const router = express.Router();
const howToUseController = require("./howTuUse.controller");
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("howToUse");

router.post("/list", howToUseController.list);
router.post("/create", upload.single("media"), (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		howToUseController.create(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/createCategory", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		howToUseController.createCategory(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/update", upload.single("media"), (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		howToUseController.update(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});
router.post("/delete", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		howToUseController.delete(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

module.exports = router;
