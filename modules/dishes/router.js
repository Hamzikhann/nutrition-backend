const router = require("express").Router();
const dishesController = require("./dishes.controller");
const fileUpload = require("../../utils/fileUpload");

const { upload } = fileUpload("dishes");

router.post("/create", upload.single("image"), async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
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

router.post("/create/category", upload.single("image"), async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await dishesController.createCategory(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to create a dish category"
		});
	}
});

router.post("/create/maincategory", upload.single("image"), async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await dishesController.createMainCategory(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to create a main category"
		});
	}
});

router.post("/list/category", async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await dishesController.listCategory(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to create a dish category"
		});
	}
});

router.post("/update", upload.single("image"), async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await dishesController.update(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to update a dish"
		});
	}
});

router.post("/delete", async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await dishesController.delete(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to delete a dish"
		});
	}
});

module.exports = router;
