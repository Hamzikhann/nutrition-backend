const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const Plans = db.plans;

exports.list = async (req, res) => {
	try {
		const plans = await Plans.findAll({ where: { isActive: "Y" } });
		encryptHelper(plans);

		res.json({
			success: true,
			data: plans
		});
	} catch (error) {
		res.json({
			success: false,
			message: error.message
		});
	}
};

exports.create = async (req, res) => {
	try {
		const joiSchema = joi.object({
			name: joi.string().required(),
			details: joi.string().required(),
			duration: joi.string().required(),
			price: joi.string().required(),
			features: joi.array().required(),
			isPopular: joi.string().optional(),
			isFree: joi.string().optional()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			let planObj = {
				name: req.body.name,
				details: req.body.details,
				duration: req.body.duration,
				features: JSON.stringify(req.body.features),
				isPopular: req.body.isPopular,
				isFree: req.body.isFree,
				price: req.body.price
			};

			let createPlan = await Plans.create(planObj);

			encryptHelper(createPlan);

			return res.status(200).send({ message: "Plan is Created", data: createPlan });
		}
	} catch (err) {
		res.json({
			success: false,
			message: err.message
		});
	}
};

exports.update = async (req, res) => {
	try {
		const joiSchema = joi.object({
			id: joi.string().required(),
			name: joi.string().required(),
			details: joi.string().required(),
			duration: joi.string().required(),
			features: joi.array().required(),
			isPopular: joi.string().optional(),
			isFree: joi.string().optional(),
			price: joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			let planObj = {
				name: req.body.name,
				details: req.body.details,
				duration: req.body.duration,
				features: JSON.stringify(req.body.features),
				isPopular: req.body.isPopular,
				isFree: req.body.isFree,
				price: req.body.price
			};

			let updatePlan = await Plans.update(planObj, {
				where: {
					id: crypto.decrypt(req.body.id)
				}
			});

			return res.status(200).send({ message: "Plan is Updated", data: updatePlan });
		}
	} catch (err) {
		res.json({
			success: false,
			message: err.message
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const { id } = req.body;
		await Plans.update({ isActive: "N" }, { where: { id: crypto.decrypt(id) } });
		return res.status(200).json({
			message: "Plan deleted successfully"
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Something went wrong"
		});
	}
};
