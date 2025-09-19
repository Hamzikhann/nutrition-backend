const db = require("../../models");
const Joi = require("joi");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { description } = require("@hapi/joi/lib/base");
const { eachQuarterOfInterval } = require("date-fns");

const Supplements = db.supplements;
const SupplementsCategories = db.supplementsCategories;

exports.create = async (req, res) => {
	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			description: Joi.string().optional(),
			externalLink: Joi.string().optional(),
			supplementCategoryId: Joi.string().optional()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		if (!req.file) {
			return res.send({ message: "File is required" }).status(201);
		}

		let image = await uploadFileToS3(req.file, "supplements");

		let supplementObj = {
			title: req.body.title,
			description: req.body.description,
			externalLink: req.body.externalLink,
			supplementsCategoryId: crypto.decrypt(req.body.supplementCategoryId),
			image: image
		};

		let createSupplement = await Supplements.create(supplementObj);

		if (createSupplement) {
			encryptHelper(createSupplement);

			return res.send({ message: "Supplement Added", data: createSupplement });
		} else {
			return res.send({ message: "Some error" });
		}
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.list = async (req, res) => {
	try {
		SupplementsCategories.findAll({
			include: [
				{
					model: Supplements
				}
			]
		})
			.then((response) => {
				encryptHelper(response);
				res.status(200).send({ message: "Supplements List", data: response });
			})
			.catch((err) => {
				res.status(500).send({
					message: err.message || "Some error occurred while reassigning the booking."
				});
			});
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.createCategory = async (req, res) => {
	try {
		const schema = Joi.object({
			title: Joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const createCategory = await SupplementsCategories.create({ title: req.body.title });
		encryptHelper(createCategory);

		res.status(200).send({ message: "Category Added", data: createCategory });
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};
