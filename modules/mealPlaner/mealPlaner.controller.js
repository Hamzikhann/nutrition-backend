const db = require("../../models");

const joi = require("joi");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");

const MealPlaner = db.mealPlaner;
const Categories = db.categories;
const Meals = db.meals;

exports.create = async (req, res) => {
	const schema = joi.object({
		day: joi.any().required(),
		categoryId: joi.string().required(),
		mealId: joi.string().required()
	});

	const { error } = schema.validate(req.body);
	if (error) {
		return res.status(400).send({ message: error.details[0].message });
	}

	let { day, categoryId, mealId } = req.body;
	categoryId = crypto.decrypt(categoryId);
	mealId = crypto.decrypt(mealId);
	let userId = crypto.decrypt(req.userId);

	let newPlan = await MealPlaner.create({
		day,
		categoryId,
		mealId,
		userId
	});
	encryptHelper(newPlan);
	return res.status(201).json({
		message: "Meal plan created successfully",
		plan: newPlan
	});
};

exports.list = async (req, res) => {
	let plans = await MealPlaner.findAll({
		where: { userId: crypto.decrypt(req.userId) },

		include: [
			{ model: Categories },
			{
				model: Meals
			}
		]
	});

	encryptHelper(plans);

	return res.send({
		message: "Meal plan list",
		plans
	});
};
