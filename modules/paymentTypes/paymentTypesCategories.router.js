const router = require("express").Router();
const paymentTypesCategoriesController = require("./paymentTypesCategories.controller");

router.post("/create", async (req, res) => {
	if (req.role === "Administrator" || req.role == "Subadmin") {
		await paymentTypesCategoriesController.createCategory(req, res);
	} else {
		return res.status(400).send({
			message: "You are not authorized to create a payment type category"
		});
	}
});

router.post("/list", async (req, res) => {
	await paymentTypesCategoriesController.listCategories(req, res);
});

module.exports = router;
