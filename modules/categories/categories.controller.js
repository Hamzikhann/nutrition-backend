const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const Joi = require("joi");
const crypto = require("../../utils/crypto");

const Categories = db.categories;
const DishesCategories = db.dishesCategories;

exports.list = async (req, res) => {
	try {
		const categories = await Categories.findAll({
			where: {
				isActive: "Y"
			}
		});
		encryptHelper(categories);

		return res.status(200).send({
			message: "Categories list",
			data: categories
		});
	} catch (error) {
		res.status(500).send({
			message: "Internal server error",
			error: error.message
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			id: Joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			console.log("Validation error:", error.details[0].message);
			return res.status(400).send({ message: error.details[0].message });
		}

		console.log("Request body:", req.body);

		const category = await Categories.update(
			{
				title: req.body.name
			},
			{
				where: { id: crypto.decrypt(req.body.id) }
			}
		);

		return res.status(200).send({
			message: "Category updated successfully",
			data: category
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while updating the category."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			id: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			let categoryId = crypto.decrypt(req.body.id);
			let updateCategory = await Categories.update(
				{
					isActive: "N"
				},
				{
					where: {
						id: categoryId
					}
				}
			);
			return res.status(200).send({
				message: "Category deleted successfully",
				data: updateCategory
			});
		}
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while deleting the category."
		});
	}
};

exports.updateSubCategory = async (req, res) => {
	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			id: Joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		let updateObj = {
			title: req.body.title
		};

		if (req.file) {
			const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");
			const s3Key = await uploadFileToSpaces(req.file, `dishesCategories`);
			updateObj.image = s3Key;
		}

		const category = await DishesCategories.update(updateObj, {
			where: { id: crypto.decrypt(req.body.id) }
		});

		return res.status(200).send({
			message: "Subcategory updated successfully",
			data: category
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while updating the subcategory."
		});
	}
};

exports.deleteSubCategory = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			id: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			let categoryId = crypto.decrypt(req.body.id);
			let updateCategory = await DishesCategories.update(
				{
					isActive: "N"
				},
				{
					where: {
						id: categoryId
					}
				}
			);
			return res.status(200).send({
				message: "Subcategory deleted successfully",
				data: updateCategory
			});
		}
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while deleting the subcategory."
		});
	}
};
