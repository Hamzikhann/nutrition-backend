const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const { uploadFileToS3 } = require("../../utils/awsServises");
const crypto = require("../../utils/crypto");

const Exercise = db.exercises;
const WorkoutDayExercises = db.workoutDayExercises;

exports.create = async (req, res) => {
	try {
		const schema = joi.object({
			name: joi.string().min(1).required().allow(null),
			description: joi.string().min(1).required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { name, description } = value;

			if (!req.file) {
				return res.status(400).send({
					message: "Video is required"
				});
			}

			const s3Key = await uploadFileToS3(req.file, "exerciseVideos");

			const exercise = await Exercise.create({
				name,
				description,
				videoURL: s3Key
			});
			encryptHelper(exercise);
			return res.status(200).send({
				message: "Exercise created successfully",
				data: exercise
			});
		}
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while creating the exercise."
		});
	}
};

exports.list = async (req, res) => {
	try {
		const exercises = await Exercise.findAll({ where: { isActive: "Y" } });
		encryptHelper(exercises);
		return res.status(200).send({
			message: "Exercises listed successfully",
			data: exercises
		});
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while listing the exercises."
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = joi.object({
			id: joi.string().required(),
			name: joi.string().min(1).required().allow(null),
			description: joi.string().min(1).required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { id, name, description } = value;
			const exercise = await Exercise.findByPk(crypto.decrypt(id));
			if (!exercise) {
				return res.status(404).send({
					message: "Exercise not found"
				});
			}

			if (req.file) {
				var s3Key = await uploadFileToS3(req.file, "exerciseVideos");
			}
			await exercise.update({
				name,
				videoURL: req.file ? s3Key : exercise.videoURL,
				description
			});
			encryptHelper(exercise);
			return res.status(200).send({
				message: "Exercise updated successfully",
				data: exercise
			});
		}
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while updating the exercise."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const schema = joi.object({
			id: joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { id } = value;
			const exercise = await Exercise.findByPk(crypto.decrypt(id));
			if (!exercise) {
				return res.status(404).send({
					message: "Exercise not found"
				});
			}

			const wde = await WorkoutDayExercises.findOne({
				where: {
					exerciseId: crypto.decrypt(id)
				}
			});
			if (wde) {
				const updateWorkoutDayExercises = await wde.update({
					isActive: "N"
				});
			}

			await exercise.update({
				isActive: "N"
			});
			encryptHelper(exercise);
			return res.status(200).send({
				message: "Exercise deleted successfully",
				data: exercise
			});
		}
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while deleting the exercise."
		});
	}
};
