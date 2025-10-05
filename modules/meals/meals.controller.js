const db = require("../../models");
const Joi = require("joi");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { sequelize } = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const mealTypes = require("../../models/mealTypes");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");

const Meals = db.meals;
const MealType = db.mealTypes;

exports.create = async (req, res) => {
	const t = await sequelize.transaction();

	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			description: Joi.string().optional(),
			kcalOptions: Joi.string().required(),
			category: Joi.string().required(),
			subCategory: Joi.string().required(),
			ingredientsDetails: Joi.string().optional(),
			cookingSteps: Joi.string().optional(),
			nutritionCalories: Joi.string().optional(),
			nutritionProtein: Joi.string().optional(),
			nutritionCarbs: Joi.string().optional(),
			nutritionFat: Joi.string().optional(),
			mealType: Joi.string().optional(),
			note: Joi.string().optional()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		let {
			title,
			description,
			kcalOptions,
			category,
			subCategory,
			ingredientsDetails,
			cookingSteps,
			nutritionCalories,
			nutritionProtein,
			nutritionCarbs,
			nutritionFat,
			mealType,
			note
		} = req.body;

		let videoUrl = null;
		if (req.file) {
			videoUrl = await uploadFileToSpaces(req.file, `meals/videos`);
		} else {
			return res.status(204).send({
				message: "Video is required"
			});
		}

		let findMelaType = await MealType.findOne({
			where: {
				title: mealType
			}
		});

		const meal = await Meals.create(
			{
				title,
				description: description || "",
				image: videoUrl,
				kcalOptions: kcalOptions,
				categoryId: crypto.decrypt(category),
				dishesCategoryId: crypto.decrypt(subCategory),
				ingredientsDetails,
				cookingSteps,
				nutritionCalories,
				nutritionProtein,
				nutritionCarbs,
				nutritionFat,
				mealTypeId: findMelaType.id,
				note
			},
			{ transaction: t }
		);

		await t.commit();

		encryptHelper(meal);

		return res.status(200).send({
			message: "Meal plan created successfully",
			data: meal
		});
	} catch (err) {
		console.log(err);
		await t.rollback();
		res.status(500).send({
			message: err.message || "Some error occurred while creating the meal plan."
		});
	}
};

exports.list = async (req, res) => {
	try {
		let role = req.role;
		let whereClause = { isActive: "Y" };
		let includeClause = [];

		// Base include for all roles
		includeClause = [
			{
				model: db.mealTypes,
				attributes: ["id", "title"]
			},
			{
				model: db.categories,
				attributes: ["id", "title"]
			},
			{
				model: db.dishesCategories,
				attributes: ["id", "title", "image"],
				required: true
			}
		];

		let meals;

		// For non-administrator users, filter by BMR
		if (role !== "Administrator") {
			// Get user's BMR value
			const userId = crypto.decrypt(req.userId);
			const user = await db.users.findOne({
				where: { id: userId, isActive: "Y" },
				attributes: ["bmr"] // Assuming BMR is stored in users table
			});

			if (!user || !user.bmr) {
				return res.status(400).send({
					message: "User BMR not found"
				});
			}

			const userBMR = user.bmr;
			console.log(`Filtering meals for user BMR: ${userBMR}`);

			// Get all meals first
			const allMeals = await db.meals.findAll({
				where: whereClause,
				include: includeClause,
				attributes: {
					exclude: ["isActive", "createdAt", "updatedAt"]
				}
			});

			// Filter meals based on kcalOptions matching user's BMR
			meals = allMeals.filter((meal) => {
				if (!meal.kcalOptions) return false;

				try {
					// Handle different formats of kcalOptions
					let kcalArray = [];

					if (typeof meal.kcalOptions === "string") {
						// Remove quotes and split by commas
						const cleanKcalOptions = meal.kcalOptions.replace(/"/g, "");
						kcalArray = cleanKcalOptions.split(",").map((kcal) => kcal.trim());
					} else if (Array.isArray(meal.kcalOptions)) {
						kcalArray = meal.kcalOptions;
					}

					// Convert to numbers and check if user's BMR matches any kcal option
					const numericKcalArray = kcalArray.map((kcal) => parseInt(kcal));
					return numericKcalArray.includes(parseInt(userBMR));
				} catch (error) {
					console.log("Error processing kcalOptions for meal:", meal.id, error);
					return false;
				}
			});

			console.log(`Found ${meals.length} meals matching user BMR: ${userBMR}`);
		} else {
			// For administrators, get all meals
			meals = await db.meals.findAll({
				where: whereClause,
				include: includeClause,
				attributes: {
					exclude: ["isActive", "createdAt", "updatedAt"]
				}
			});
		}

		encryptHelper(meals);
		return res.status(200).send({
			message: "Meal plans retrieved successfully",
			data: meals,
			userBMR: role !== "Administrator" ? userBMR : undefined
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while retrieving meal plans."
		});
	}
};
exports.update = async (req, res) => {
	const t = await sequelize.transaction();

	try {
		const schema = Joi.object({
			id: Joi.string().required(),
			title: Joi.string().optional().allow("").allow(null),
			description: Joi.string().optional().allow("").allow(null),
			video: Joi.any().optional().allow("").allow(null),
			kcalOptions: Joi.string().required().allow("").allow(null),
			mealType: Joi.string().optional().allow("").allow(null),
			category: Joi.string().optional().allow("").allow(null),
			subCategory: Joi.string().optional().allow("").allow(null),
			ingredientsDetails: Joi.string().optional().allow("").allow(null),
			cookingSteps: Joi.string().optional().allow("").allow(null),
			nutritionCalories: Joi.string().optional().allow("").allow(null),
			nutritionProtein: Joi.string().optional().allow("").allow(null),
			nutritionCarbs: Joi.string().optional().allow("").allow(null),
			nutritionFat: Joi.string().optional().allow("").allow(null),
			note: Joi.string().optional().allow("").allow(null)
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const { id } = req.body;
		const mealId = crypto.decrypt(id);

		const meal = await Meals.findByPk(mealId);
		if (!meal) {
			return res.status(404).send({ message: "Meal plan not found" });
		}

		let videoUrl = meal.image;
		if (req.file) {
			videoUrl = await uploadFileToSpaces(req.file, `meals/videos`);
		}

		await meal.update(
			{
				title: req.body.title || meal.title,
				description: req.body.description || meal.description,
				image: videoUrl,
				kcalOptions: req.body.kcalOptions ? JSON.stringify(req.body.kcalOptions) : meal.kcalOptions,
				planName: req.body.planName || meal.planName,
				categoryId: crypto.decrypt(req.body.category) || meal.categoryId,
				dishesCategoryId: crypto.decrypt(req.body.subCategory) || meal.dishesCategoryId,
				ingredientsDetails: req.body.ingredientsDetails || meal.ingredientsDetails,
				cookingSteps: req.body.cookingSteps || meal.cookingSteps,
				nutritionCalories: req.body.nutritionCalories || meal.nutritionCalories,
				nutritionProtein: req.body.nutritionProtein || meal.nutritionProtein,
				nutritionCarbs: req.body.nutritionCarbs || meal.nutritionCarbs,
				nutritionFat: req.body.nutritionFat || meal.nutritionFat,
				note: req.body.note || meal.note
			},
			{ transaction: t }
		);

		await t.commit();

		encryptHelper(meal);

		return res.status(200).send({
			message: "Meal plan updated successfully",
			data: meal
		});
	} catch (err) {
		console.log(err);
		await t.rollback();
		res.status(500).send({
			message: err.message || "Some error occurred while updating the meal plan."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const { id } = req.body;
		const mealId = crypto.decrypt(id);

		const meal = await Meals.findByPk(mealId);
		if (!meal) {
			return res.status(404).send({ message: "Meal plan not found" });
		}

		await meal.update({ isActive: "N" });

		return res.status(200).send({
			message: "Meal plan deleted successfully"
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while deleting the meal plan."
		});
	}
};
