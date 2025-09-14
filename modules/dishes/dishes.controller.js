const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const Joi = require("joi");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { sequelize } = require("../../models");
const crypto = require("../../utils/crypto");

const Dishes = db.dishes;
const Ingredients = db.ingredients;
const Nutrition = db.nutrition;
const Directions = db.directions;
const AssignedIngredients = db.assignedIngredients;
const DishesCategories = db.dishesCategories;
const Categories = db.categories;

exports.create = async (req, res) => {
	const t = await sequelize.transaction(); // start transaction

	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			// description: Joi.string().required(),
			ingredients: Joi.string().required(), // stringified JSON
			nutritions: Joi.string().required(),
			directions: Joi.string().required(),
			categoryId: Joi.string().required(),
			subCategoryId: Joi.string().required()
		});

		console.log(req.body);
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}
		console.log(req.file);

		// Parse JSON fields
		let { title, ingredients, nutritions, directions, subCategoryId } = req.body;
		// ingredients = JSON.parse(ingredients);
		// nutrition = JSON.parse(nutrition);
		// directions = JSON.parse(directions);

		console.log(typeof ingredients);
		console.log(typeof nutritions);
		console.log(typeof directions);

		// Upload to S3
		const s3Key = await uploadFileToS3(req.file, `ingredients`);

		// Create Dish
		const dish = await Dishes.create(
			{
				title,
				description: req.body.description ? req.body.description : "",
				image: s3Key,
				ingredients,
				nutritions: nutritions,
				directions,
				dishesCategoryId: crypto.decrypt(subCategoryId)
			},
			{ transaction: t }
		);

		// const newIngredient = await Ingredients.create(
		// 			{
		// 				name:ingredients
		// 			},
		// 			{ transaction: t }
		// 		);

		// Handle Ingredients
		// for (let i = 0; i < ingredients.length; i++) {
		// 	const ingredient = ingredients[i];
		// 	let ingredientId;

		// 	if (ingredient.id) {
		// 		ingredientId = crypto.decrypt(ingredient.id);
		// 	} else {
		// 		const newIngredient = await Ingredients.create(
		// 			{
		// 				name: ingredient.name
		// 			},
		// 			{ transaction: t }
		// 		);
		// 		ingredientId = newIngredient.id;
		// 	}

		// 	await AssignedIngredients.create(
		// 		{
		// 			dishId: dish.id,
		// 			ingredientId: ingredientId
		// 		},
		// 		{ transaction: t }
		// 	);
		// }

		// Nutrition
		// await Nutrition.create(
		// 	{
		// 		calories:nutrition,
		// 		dishId: dish.id
		// 	},
		// 	{ transaction: t }
		// );

		// // Directions
		// await Directions.create({ directions, dishId: dish.id }, { transaction: t });

		encryptHelper(dish);

		// Commit transaction
		await t.commit();

		return res.status(200).send({
			message: "Dish created successfully",
			data: dish
		});
	} catch (err) {
		console.log(err);
		await t.rollback(); // rollback transaction on error
		res.status(500).send({
			message: err.message || "Some error occurred while creating the dish."
		});
	}
};

exports.list = async (req, res) => {
	try {
		const dishes = await Categories.findAll({
			// where: { isActive: "Y" },
			include: [
				{
					model: DishesCategories,
					include: [
						{
							model: Dishes,
							required: false,
							// include: [
							// 	{
							// 		model: AssignedIngredients,
							// 		required: false,
							// 		attributes: {
							// 			exclude: ["name", "quantity", "createdAt", "updatedAt", "mealId"]
							// 		},

							// 		include: [
							// 			{
							// 				model: Ingredients,
							// 				required: false,
							// 				attributes: {
							// 					exclude: ["createdAt", "updatedAt", "mealId"]
							// 				}
							// 			}
							// 		]
							// 	},
							// 	{
							// 		model: Nutrition,
							// 		required: false,
							// 		attributes: {
							// 			exclude: ["createdAt", "updatedAt", "mealId"]
							// 		}
							// 	},
							// 	{
							// 		model: Directions,
							// 		required: false,
							// 		attributes: {
							// 			exclude: ["createdAt", "updatedAt", "mealId"]
							// 		}
							// 	}
							// ],
							attributes: {
								exclude: ["createdAt", "updatedAt", "mealId"]
							}
						}
					]
				}
			],

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
		console.log(err);
		// emails.errorEmail(req, err);
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
		console.log("req.body", req.body);
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		let exist = await DishesCategories.findOne({
			where: { title: req.body.title, categoryId: crypto.decrypt(req.body.categoryId) }
		});

		if (exist) {
			return res.status(200).json({ message: "This Category is Already created" });
		}

		const s3Key = await uploadFileToS3(req.file, `dishesCategories`);

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
		console.log(err);
		// emails.errorEmail(req, err);
		res.status(500).send({
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
		console.log("req.body", req.body);
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		let exist = await Categories.findOne({
			where: { title: req.body.name }
		});

		if (exist) {
			return res.status(200).json({ message: "This Main Category is Already created" });
		}

		const s3Key = await uploadFileToS3(req.file, `categories`);

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
		console.log(err);
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while creating the main category."
		});
	}
};

exports.listCategory = async (req, res) => {
	try {
		let listCategory = await DishesCategories.findAll({
			include: [
				{
					model: Categories
				}
			]
		});

		let list = await Categories.findAll({
			include: [{ model: DishesCategories }]
		});
		encryptHelper(listCategory);
		encryptHelper(list);
		return res.status(200).send({
			message: "Dishes Category List Fetched",
			data: listCategory,
			list
		});
	} catch (err) {
		console.log(err);
		// emails.errorEmail(req, err);
		return res.status(500).send({
			message: err.message || "Some error occurred while fetching the dish category."
		});
	}
};
