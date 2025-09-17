const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");

const Week = db.weeks;
const WorkoutDays = db.workoutDays;
const WorkOutDayExercises = db.workoutDayExercises;
const Exercise = db.exercises;

exports.list = async (req, res) => {
	try {
		let workout = await Week.findAll({
			include: [
				{
					model: WorkoutDays,
					include: [
						{
							model: WorkOutDayExercises,
							include: [
								{
									model: Exercise,
									attributes: {
										exclude: ["createdAt", "updatedAt", "workoutDayId"]
									}
								}
							],
							attributes: {
								exclude: ["createdAt", "updatedAt", "exerciseId", "weekId", "workoutDayId"]
							}
						}
					],
					attributes: {
						exclude: ["createdAt", "updatedAt"]
					}
				}
			],
			attributes: {
				exclude: ["createdAt", "updatedAt", "order", "planId"]
			}
		});
		encryptHelper(workout);

		return res.status(200).send({
			message: "Work out day exercises listed successfully",
			data: workout
		});
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while listing the work out day exercises."
		});
	}
};

exports.detail = async (req, res) => {
	try {
		let workout = await Week.findOne({
			where: {
				id: crypto.decrypt(req.body.weekId)
			},
			include: [
				{
					model: WorkoutDays,
					include: [
						{
							model: WorkOutDayExercises,
							where: {
								isActive: "Y",
								weekId: crypto.decrypt(req.body.weekId)
							},
							include: [
								{
									model: Exercise,
									attributes: {
										exclude: ["createdAt", "updatedAt", "workoutDayId"]
									}
								}
							],
							attributes: {
								exclude: ["createdAt", "updatedAt", "exerciseId", "weekId", "workoutDayId"]
							}
						}
					],
					attributes: {
						exclude: ["createdAt", "updatedAt"]
					}
				}
			],
			attributes: {
				exclude: ["createdAt", "updatedAt", "order", "planId"]
			}
		});
		encryptHelper(workout);

		return res.status(200).send({
			message: "Work out day exercises listed successfully",
			data: workout
		});
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while listing the work out day exercises."
		});
	}
};

exports.create = async (req, res) => {
	try {
		const schema = joi.object({
			weekId: joi.string().required(),
			workoutDayId: joi.string().required(),
			exerciseId: joi.string().required(),
			sets: joi.string().required(),
			reps: joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { weekId, workoutDayId, exerciseId, sets, reps } = value;
			const week = await Week.findOne({
				where: {
					id: crypto.decrypt(weekId)
				}
			});
			if (!week) {
				return res.status(400).send({
					message: "Week not found"
				});
			}
			const workoutDays = await WorkoutDays.findOne({
				where: {
					id: crypto.decrypt(workoutDayId)
				}
			});
			if (!workoutDays) {
				return res.status(400).send({
					message: "Workout day not found"
				});
			}
			const exercise = await Exercise.findOne({
				where: {
					id: crypto.decrypt(exerciseId)
				}
			});
			if (!exercise) {
				return res.status(400).send({
					message: "Exercise not found"
				});
			}

			const workoutExist = await WorkOutDayExercises.findOne({
				where: {
					weekId: crypto.decrypt(weekId),
					workoutDayId: crypto.decrypt(workoutDayId),
					exerciseId: crypto.decrypt(exerciseId)
				}
			});
			if (workoutExist) {
				return res.status(400).send({
					message: "Workout day exercise already exists"
				});
			}

			const workOutDayExercise = await WorkOutDayExercises.create({
				weekId: crypto.decrypt(weekId),
				workoutDayId: crypto.decrypt(workoutDayId),
				exerciseId: crypto.decrypt(exerciseId),
				sets,
				reps
			});
			encryptHelper(workOutDayExercise);
			return res.status(200).send({
				message: "Work out day exercise created successfully"
			});
		}
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while creating the work out day exercise."
		});
	}
};

exports.listWeeks = async (req, res) => {
	try {
		const weeks = await Week.findAll();
		encryptHelper(weeks);
		return res.status(200).send({
			message: "Weeks listed successfully",
			data: weeks
		});
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while listing the weeks."
		});
	}
};

exports.listWorkOutDays = async (req, res) => {
	try {
		const workOutDays = await WorkoutDays.findAll();
		encryptHelper(workOutDays);
		return res.status(200).send({
			message: "Work out days listed successfully",
			data: workOutDays
		});
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while listing the work out days."
		});
	}
};
