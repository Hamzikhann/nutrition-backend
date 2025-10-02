const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const Joi = require("joi");

const PaymentTypesCategories = db.paymentTypesCategories;

exports.createCategory = async (req, res) => {
	try {
		const schema = Joi.object({
			title: Joi.string().required()
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const { title, isActive } = value;

		const newCategory = await PaymentTypesCategories.create({
			title,
			isActive
		});

		encryptHelper(newCategory);

		return res.status(200).send({
			message: "Payment type category created successfully",
			data: newCategory
		});
	} catch (err) {
		console.error(err);
		return res.status(500).send({
			message: err.message || "Some error occurred while creating the payment type category."
		});
	}
};

exports.listCategories = async (req, res) => {
	try {
		const categories = await PaymentTypesCategories.findAll({
			where: {
				isActive: "Y"
			}
		});

		encryptHelper(categories);

		return res.status(200).send({
			message: "Payment type categories list",
			data: categories
		});
	} catch (err) {
		console.error(err);
		return res.status(500).send({
			message: "Internal server error",
			error: err.message
		});
	}
};
