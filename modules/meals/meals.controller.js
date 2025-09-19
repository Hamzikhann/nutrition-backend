const db = require("../../models");
const Joi = require("joi");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { sequelize } = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const mealTypes = require("../../models/mealTypes");

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
			mealType: Joi.string().optional()
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
			mealType
		} = req.body;

		let videoUrl = null;
		if (req.file) {
			videoUrl = await uploadFileToS3(req.file, `meals/videos`);
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
				mealTypeId: findMelaType.id
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
				attributes: ["title"]
			},
			{
				model: db.categories,
				attributes: ["title"]
			},
			{
				model: db.dishesCategories,
				attributes: ["title", "image"],
				required: true
			}
		];
		console.log(crypto.decrypt(req.userId));
		// For non-administrator users, filter by assigned meals
		if (role !== "Administrator") {
			includeClause.push({
				model: db.assignedMeals,
				where: { isActive: "Y", userId: crypto.decrypt(req.userId) },
				required: true // Use INNER JOIN to only get meals that are assigned to the user
			});
		}

		const meals = await db.meals.findAll({
			where: whereClause,
			include: includeClause,
			attributes: {
				exclude: ["isActive", "createdAt", "updatedAt"]
			}
		});

		encryptHelper(meals);
		return res.status(200).send({
			message: "Meal plans retrieved successfully",
			data: meals
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
			title: Joi.string().optional(),
			description: Joi.string().optional(),
			video: Joi.any().optional(),
			kcalOptions: Joi.array().items(Joi.number()).optional(),
			planName: Joi.string().optional(),
			category: Joi.string().optional(),
			subCategory: Joi.string().optional(),
			ingredientsDetails: Joi.string().optional(),
			cookingSteps: Joi.string().optional(),
			nutritionCalories: Joi.string().optional(),
			nutritionProtein: Joi.string().optional(),
			nutritionCarbs: Joi.string().optional(),
			nutritionFat: Joi.string().optional()
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
			videoUrl = await uploadFileToS3(req.file, `meals/videos`);
		}

		await meal.update(
			{
				title: req.body.title || meal.title,
				description: req.body.description || meal.description,
				image: videoUrl,
				kcalOptions: req.body.kcalOptions ? JSON.stringify(req.body.kcalOptions) : meal.kcalOptions,
				planName: req.body.planName || meal.planName,
				category: req.body.category || meal.category,
				subCategory: req.body.subCategory || meal.subCategory,
				ingredientsDetails: req.body.ingredientsDetails || meal.ingredientsDetails,
				cookingSteps: req.body.cookingSteps || meal.cookingSteps,
				nutritionCalories: req.body.nutritionCalories || meal.nutritionCalories,
				nutritionProtein: req.body.nutritionProtein || meal.nutritionProtein,
				nutritionCarbs: req.body.nutritionCarbs || meal.nutritionCarbs,
				nutritionFat: req.body.nutritionFat || meal.nutritionFat
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
