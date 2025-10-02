const router = require("express").Router();
const bannerController = require("./banner.controller");
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("banner");

router.post(
	"/create",
	upload.single("image"),

	(req, res) => {
		console.log(req.file);
		if (req.role == "Administrator" || req.role == "Subadmin") {
			bannerController.create(req, res);
		} else {
			res.status(403).send({ message: "Forbidden Access" });
		}
	}
);

router.post("/list", bannerController.list);

router.post("/update", upload.single("image"), (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		bannerController.update(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/delete", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		bannerController.delete(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

module.exports = router;
