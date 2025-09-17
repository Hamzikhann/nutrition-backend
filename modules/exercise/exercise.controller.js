const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const Exercise = db.exercises;
const { uploadFileToS3 } = require("../../utils/awsServises");

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
		const exercises = await Exercise.findAll();
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
