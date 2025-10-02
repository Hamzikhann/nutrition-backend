const router = require("express").Router();
const paymentTypesController = require("./paymentTypes.controller");

router.post("/create", async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await paymentTypesController.create(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to create a payment type"
		});
	}
});

router.post("/list", async (req, res) => {
	await paymentTypesController.list(req, res);
});

router.post("/detail", async (req, res) => {
	await paymentTypesController.detail(req, res);
});

router.post("/update", async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await paymentTypesController.update(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to update a payment type"
		});
	}
});

router.post("/delete", async (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		await paymentTypesController.delete(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to delete a payment type"
		});
	}
});

module.exports = router;
