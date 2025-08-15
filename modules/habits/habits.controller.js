const Joi = require("joi");
const db = require("../../models");
const emails = require("../../utils/emails");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");

const Habits = db.habits;

exports.create = async (req, res) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			description: Joi.string().required(),
			mandatory: Joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { name, description, mandatory } = value;
			console.log(req.userId);
			const habit = await Habits.create({
				name,
				description,
				mandatory,
				createdBy: crypto.decrypt(req.userId),

				userId: crypto.decrypt(req.userId)
			});
			encryptHelper(habit);
			return res.status(200).send({
				message: "Habit created successfully",
				data: habit
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.list = async (req, res) => {
	try {
		let userId = crypto.decrypt(req.userId);
		let whereClause = {};

		if (userId == 1) {
			whereClause = {
				isActive: "Y"
			};
		} else {
			whereClause = {
				isActive: "Y",
				userId: userId
			};
		}

		const habits = await Habits.findAll({
			where: whereClause
		});
		encryptHelper(habits);
		return res.status(200).send({
			message: "Habit list",
			data: habits
		});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.updateStatus = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const id = crypto.decrypt(req.body.id);
			const habit = await Habits.update(
				{
					status: "Completed"
				},
				{
					where: {
						id
					}
				}
			);
			// encryptHelper(habit);
			return res.status(200).send({
				message: "Habit status updated successfully",
				data: habit
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.detail = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.number().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { id } = value;
			const habit = await Habits.findOne({
				where: {
					id
				}
			});
			encryptHelper(habit);
			return res.status(200).send({
				message: "Habit detail",
				data: habit
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.number().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { id } = value;
			const habit = await Habits.update(
				{
					isActive: "N"
				},
				{
					where: {
						id
					}
				}
			);
			encryptHelper(habit);
			return res.status(200).send({
				message: "Habit deleted successfully",
				data: habit
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.number().required(),
			name: Joi.string().required(),
			description: Joi.string().required(),
			mandatory: Joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { id, name, description, mandatory } = value;
			const habit = await Habits.update(
				{
					name,
					description,
					mandatory
				},
				{
					where: {
						id
					}
				}
			);
			encryptHelper(habit);
			return res.status(200).send({
				message: "Habit updated successfully",
				data: habit
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};
