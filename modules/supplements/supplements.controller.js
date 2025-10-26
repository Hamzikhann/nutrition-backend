const db = require("../../models");
const Joi = require("joi");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
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
			dosage: Joi.string().optional(),
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
			dosage: req.body.dosage,
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
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.list = async (req, res) => {
	try {
		// Fetch current user + role
		let userRole = req.role;
		let userId = crypto.decrypt(req.userId);
		let whereCondition = { isActive: "Y" };

		if (userRole !== "Administrator") {
			// 1️⃣ Get assigned categories for this user
			const assignedCategories = await AssignedSupplements.findAll({
				where: { userId: userId, isActive: "Y" }
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
			include: [{ where: { isActive: "Y" }, model: Supplements, required: false }]
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
		const decryptedUserId = crypto.decrypt(userId);
		const decryptedIds = supplementCategoryId.map((id) => crypto.decrypt(id).toString());

		await db.sequelize.transaction(async (transaction) => {
			// Step 1: Deactivate all current assignments
			await AssignedSupplements.update(
				{ isActive: "N" },
				{
					where: {
						userId: decryptedUserId,
						isActive: "Y"
					},
					transaction
				}
			);

			// Step 2: For each requested category, activate existing or create new
			for (const categoryId of decryptedIds) {
				const [assignment] = await AssignedSupplements.findOrCreate({
					where: {
						userId: decryptedUserId,
						supplementsCategoryId: categoryId
					},
					defaults: {
						userId: decryptedUserId,
						supplementsCategoryId: categoryId,
						isActive: "Y"
					},
					transaction
				});

				// If it existed but was inactive, activate it
				if (assignment.isActive !== "Y") {
					await assignment.update({ isActive: "Y" }, { transaction });
				}
			}
		});

		res.status(200).send({
			message: "Supplement assignments updated successfully",
			assignedCategories: decryptedIds
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "An error occurred while updating supplement assignments."
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required(),
			title: Joi.string().required(),
			description: Joi.string().optional().allow("").allow(null),
			externalLink: Joi.string().optional().allow("").allow(null),
			dosage: Joi.string().optional().allow("").allow(null),
			supplementCategoryId: Joi.string().optional().allow("").allow(null),
			image: Joi.string().optional().allow("").allow(null)
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const { id, title, description, externalLink, dosage, supplementCategoryId } = req.body;

		let updateObj = {
			title: title,
			description: description,
			externalLink: externalLink,
			dosage: dosage,
			supplementsCategoryId: crypto.decrypt(supplementCategoryId)
		};

		if (req.file) {
			let image = await uploadFileToSpaces(req.file, "supplements");
			updateObj.image = image;
		}

		await Supplements.update(updateObj, { where: { id: crypto.decrypt(id) } });

		res.status(200).send({ message: "Supplement updated" });
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const { id } = req.body;

		await Supplements.update({ isActive: "N" }, { where: { id: crypto.decrypt(id) } });
		return res.status(200).json({
			message: "Supplement deleted successfully"
		});
	} catch (err) {
		res.status(500).json({
			message: "Something went wrong"
		});
	}
};
