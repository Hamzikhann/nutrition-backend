const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const Joi = require("joi");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { sequelize } = require("../../models");

const Dishes = db.dishes;
const Ingredients = db.ingredients;
const Nutrition = db.nutrition;
const Directions = db.directions;
const AssignedIngredients = db.assignedIngredients;

exports.create = async (req, res) => {
	const t = await sequelize.transaction(); // start transaction

	try {
		const schema = Joi.object({
			title: Joi.string().required(),
			description: Joi.string().required(),
			ingredients: Joi.string().required(), // stringified JSON
			nutrition: Joi.string().required(),
			directions: Joi.string().required()
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
		let { title, description, ingredients, nutrition, directions } = req.body;
		ingredients = JSON.parse(ingredients);
		nutrition = JSON.parse(nutrition);
		directions = JSON.parse(directions);

		console.log(typeof ingredients);
		console.log(typeof nutrition);
		console.log(typeof directions);

		// Upload to S3
		const s3Key = await uploadFileToS3(req.file, `ingredients`);

		// Create Dish
		const dish = await Dishes.create(
			{
				title,
				description,
				image: s3Key
			},
			{ transaction: t }
		);

		// Handle Ingredients
		for (let i = 0; i < ingredients.length; i++) {
			const ingredient = ingredients[i];
			let ingredientId;

			if (ingredient.id) {
				ingredientId = crypto.decrypt(ingredient.id);
			} else {
				const newIngredient = await Ingredients.create(
					{
						name: ingredient.name
					},
					{ transaction: t }
				);
				ingredientId = newIngredient.id;
			}

			await AssignedIngredients.create(
				{
					dishId: dish.id,
					ingredientId: ingredientId
				},
				{ transaction: t }
			);
		}

		// Nutrition
		await Nutrition.create(
			{
				...nutrition,
				dishId: dish.id
			},
			{ transaction: t }
		);

		// Directions
		await Directions.bulkCreate(
			directions.map((d) => ({
				...d,
				dishId: dish.id
			})),
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
		console.log(err);
		await t.rollback(); // rollback transaction on error
		res.status(500).send({
			message: err.message || "Some error occurred while creating the dish."
		});
	}
};

exports.list = async (req, res) => {
	try {
		const dishes = await Dishes.findAll({
			include: [
				{
					model: AssignedIngredients,
					include: [
						{
							model: Ingredients
						}
					]
				},
				{
					model: Nutrition
				},
				{
					model: Directions
				}
			]
		});
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
