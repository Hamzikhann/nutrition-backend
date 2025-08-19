const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const Joi = require("joi");
const crypto = require("../../utils/crypto");

const Ingredients = db.ingredients;
const AssignedIngredients = db.assignedIngredients;

exports.list = async (req, res) => {
	try {
		const ingredients = await Ingredients.findAll();
		encryptHelper(ingredients);

		return res.status(200).send({
			message: "Ingredients list",
			data: ingredients
		});
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error"
		});
	}
};

exports.create = async (req, res) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			quantity: Joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const { name, quantity } = req.body;
		const ingredient = await Ingredients.create({
			name
		});
		encryptHelper(ingredient);
		return res.status(200).send({
			message: "Ingredient created",
			data: ingredient
		});
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error"
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required(),

			name: Joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const { id } = req.body;
		id = crypto.decrypt(id);
		const { name, quantity } = req.body;
		const ingredient = await Ingredients.update(
			{
				name
			},
			{
				where: {
					id
				}
			}
		);
		return res.status(200).send({
			message: "Ingredient updated",
			ingredient
		});
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error"
		});
	}
};
