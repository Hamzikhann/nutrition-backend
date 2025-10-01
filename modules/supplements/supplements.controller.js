const db = require("../../models");
const Joi = require("joi");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { description } = require("@hapi/joi/lib/base");
const { eachQuarterOfInterval } = require("date-fns");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");

const Supplements = db.supplements;
const SupplementsCategories = db.supplementsCategories;
const AssignedSupplements = db.assignedSupplements;
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

		let image = await uploadFileToSpaces(req.file, "supplements");

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

// exports.list = async (req, res) => {
// 	try {
// 		SupplementsCategories.findAll({
// 			include: [
// 				{
// 					model: Supplements
// 				}
// 			]
// 		})
// 			.then((response) => {
// 				encryptHelper(response);
// 				res.status(200).send({ message: "Supplements List", data: response });
// 			})
// 			.catch((err) => {
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while reassigning the booking."
// 				});
// 			});
// 	} catch (err) {
// 		// emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred while reassigning the booking."
// 		});
// 	}
// };

exports.list = async (req, res) => {
	try {
		// Fetch current user + role
		let userRole = req.role;
		let userId = crypto.decrypt(req.userId);
		let whereCondition = {};

		if (userRole !== "Administrator") {
			// 1️⃣ Get assigned categories for this user
			const assignedCategories = await AssignedSupplements.findAll({
				where: { userId: userId, isActive: "Y" }
				// attributes: ["categoryId"]
			});

			// 2️⃣ Extract category IDs into array
			const categoryIds = assignedCategories.map((c) => c.supplementsCategoryId);

			// 3️⃣ Only filter if user actually has assigned categories
			if (categoryIds.length > 0) {
				whereCondition = { id: { [db.Sequelize.Op.in]: categoryIds } };
			} else {
				// If no assigned categories → return empty
				return res.status(200).send({
					message: "No categories assigned",
					data: []
				});
			}
		}

		// 4️⃣ Fetch categories (with supplements inside)
		const response = await SupplementsCategories.findAll({
			where: whereCondition,
			include: [{ model: Supplements }]
		});

		encryptHelper(response);

		res.status(200).send({
			message: "Supplements Categories List",
			data: response
		});
	} catch (err) {
		console.error(err);
		res.status(500).send({
			message: err.message || "Some error occurred while fetching supplement categories."
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

exports.assignSupplementToCategory = async (req, res) => {
	try {
		const schema = Joi.object({
			supplementCategoryId: Joi.array().required(),
			userId: Joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		let { supplementCategoryId, userId } = req.body;

		let ids = supplementCategoryId.map((element) => crypto.decrypt(element));

		const category = await SupplementsCategories.findAll({
			where: {
				id: ids
			}
		});

		if (!category) {
			return res.status(400).send({ message: "Category not found" });
		}

		ids.forEach(async (element) => {
			await AssignedSupplements.create({
				supplementsCategoryId: element,
				userId: crypto.decrypt(userId)
			});
		});

		res.status(200).send({ message: "Supplement assigned to user" });
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};
