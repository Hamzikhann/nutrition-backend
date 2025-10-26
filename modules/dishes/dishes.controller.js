const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const Joi = require("joi");
const { sequelize } = require("../../models");
const crypto = require("../../utils/crypto");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");

const Dishes = db.dishes;

const DishesCategories = db.dishesCategories;
const Categories = db.categories;

exports.create = async (req, res) => {
	const t = await sequelize.transaction(); // start transaction

	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			ingredients: Joi.string().required(), // stringified JSON
			nutritions: Joi.string().required(),
			directions: Joi.string().required(),
			categoryId: Joi.string().required(),
			subCategoryId: Joi.string().required(),
			note: Joi.string().optional()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		// Parse JSON fields
		let { title, ingredients, nutritions, directions, subCategoryId, note } = req.body;

		// Upload to S3
		const s3Key = await uploadFileToSpaces(req.file, `ingredients`);

		// Create Dish
		const dish = await Dishes.create(
			{
				title,
				description: req.body.description ? req.body.description : "",
				image: s3Key,
				ingredients,
				nutritions: nutritions,
				directions,
				note,
				dishesCategoryId: crypto.decrypt(subCategoryId)
			},
			{ transaction: t }
		);

		encryptHelper(dish);

		// Commit transaction
		await t.commit();

		return res.status(200).send({
			message: "Dish created successfully",
			data: dish
		});
	} catch (err) {
		await t.rollback(); // rollback transaction on error
		res.status(500).send({
			message: err.message || "Some error occurred while creating the dish."
		});
	}
};

exports.list = async (req, res) => {
	try {
		const dishes = await Categories.findAll({
			include: [
				{
					model: DishesCategories,
					where: { isActive: "Y" },

					include: [
						{
							model: Dishes,
							where: {
								isActive: "Y"
							},
							required: true,

							attributes: {
								exclude: ["createdAt", "updatedAt", "mealId"]
							}
						}
					]
				}
			],
			where: { isActive: "Y" },
			attributes: {
				exclude: ["isActive", "createdAt", "updatedAt"]
			}
		});

		encryptHelper(dishes);
		return res.status(200).send({
			message: "Dishes retrieved successfully",
			data: dishes
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while retrieving dishes."
		});
	}
};

exports.createCategory = async (req, res) => {
	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			categoryId: Joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		let exist = await DishesCategories.findOne({
			where: { title: req.body.title, categoryId: crypto.decrypt(req.body.categoryId), isActive: "Y" }
		});

		if (exist) {
			return res.status(200).json({ message: "This Category is Already created" });
		}

		const s3Key = await uploadFileToSpaces(req.file, `dishesCategories`);

		const category = await DishesCategories.create({
			title: req.body.title,
			image: s3Key,
			categoryId: crypto.decrypt(req.body.categoryId)
		});
		encryptHelper(category);
		return res.status(200).send({
			message: "Dish category created successfully",
			data: category
		});
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred while creating the dish category."
		});
	}
};

exports.createMainCategory = async (req, res) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			subCategoryName: Joi.string().optional()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		let exist = await Categories.findOne({
			where: { title: req.body.name, isActive: "Y" }
		});

		if (exist) {
			return res.status(200).json({ message: "This Main Category is Already created" });
		}

		const s3Key = await uploadFileToSpaces(req.file, `categories`);

		const category = await Categories.create({
			title: req.body.name
		});

		// If subCategoryName is provided, create subcategory
		if (req.body.subCategoryName) {
			const subCategory = await DishesCategories.create({
				title: req.body.subCategoryName,
				image: s3Key, // Use same image or upload another?
				categoryId: category.id
			});
		}

		encryptHelper(category);
		return res.status(200).send({
			message: "Main category created successfully",
			data: category
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while creating the main category."
		});
	}
};

exports.listCategory = async (req, res) => {
	try {
		let listCategory = await DishesCategories.findAll({
			where: { isActive: "Y" },
			include: [
				{
					model: Categories,
					where: { isActive: "Y" }
				}
			]
		});

		let list = await Categories.findAll({
			where: { isActive: "Y" },
			include: [{ model: DishesCategories, where: { isActive: "Y" }, required: false }]
		});

		encryptHelper(listCategory);
		encryptHelper(list);

		return res.status(200).send({
			message: "Dishes Category List Fetched",
			data: listCategory,
			list
		});
	} catch (err) {
		return res.status(500).send({
			message: err.message || "Some error occurred while fetching the dish category."
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			id: Joi.string().required(),
			ingredients: Joi.string().required(), // stringified JSON
			nutritions: Joi.string().required(),
			directions: Joi.string().required(),
			categoryId: Joi.string().required(),
			subCategoryId: Joi.string().required(),
			note: Joi.string().optional().allow("").allow(null)
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			let updateObj = {
				title: value.title,
				ingredients: value.ingredients,
				nutritions: value.nutritions,
				directions: value.directions,
				dishesCategoryId: crypto.decrypt(value.subCategoryId),
				note: value.note
			};
			if (req.file) {
				const s3Key = await uploadFileToSpaces(req.file, `dishes`);
				value.image = s3Key;
			}

			if (value.image) {
				updateObj.image = value.image;
			}

			const dish = await Dishes.update(updateObj, {
				where: { id: crypto.decrypt(value.id) }
			});
			encryptHelper(dish);
			return res.status(200).send({
				message: "Dish updated successfully",
				data: dish
			});
		}
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while updating the dish."
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
			let dishId = crypto.decrypt(req.body.id);
			let updateDish = await Dishes.update(
				{
					isActive: "N"
				},
				{
					where: {
						id: dishId
					}
				}
			);
			return res.status(200).send({
				message: "Dish deleted successfully",
				data: updateDish
			});
		}
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while deleting the dish."
		});
	}
};
