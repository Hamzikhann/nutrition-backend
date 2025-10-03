const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");

const Week = db.weeks;
const WorkoutDays = db.workoutDays;
const WorkOutDayExercises = db.workoutDayExercises;
const Exercise = db.exercises;
const WorkoutsCompletions = db.workoutsCompletions;
const Plan = db.plans;
const UserPlan = db.userPlans;
exports.listofAdmin = async (req, res) => {
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
								},
								{
									model: WorkoutsCompletions
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

exports.list = async (req, res) => {
	try {
		// 1. Find user's plan

		const userPlan = await UserPlan.findOne({
			where: { userId: crypto.decrypt(req.userId) } // assuming protect middleware sets userId
			// include: [{ model: Plan, attributes: ["duration"] }]
		});

		if (!userPlan) {
			return res.status(404).send({ message: "No plan found for user" });
		}

		// 2. Convert duration → weeks
		const durationWeeks = convertDurationToWeeks(userPlan.duration);
		console.log(durationWeeks);
		// 3. Fetch workouts limited to duration
		let workout = await Week.findAll({
			where: {
				title: { [db.Sequelize.Op.lte]: `Week ${durationWeeks}` } // or better: use numeric order field if you have one
			},
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
								},
								{
									model: WorkoutsCompletions
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

exports.updateStatus = async (req, res) => {
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
			const workOutDayExercise = await WorkOutDayExercises.findOne({
				where: {
					id: crypto.decrypt(id)
				}
			});
			if (!workOutDayExercise) {
				return res.status(400).send({
					message: "Work out day exercise not found"
				});
			}
			let findWorkoutCompleted = await WorkoutsCompletions.findOne({
				where: {
					workoutDayExerciseId: crypto.decrypt(id)
				}
			});

			if (findWorkoutCompleted) {
				return res.status(400).send({
					message: "Work out day exercise already completed"
				});
			}
			let updateWorkoutCompleted = await WorkoutsCompletions.create({
				status: "Completed",
				userId: crypto.decrypt(req.userId), //req.userId
				workoutDayExerciseId: crypto.decrypt(id)
			});

			return res.status(200).send({
				message: "Work out day exercise updated successfully"
			});
		}
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while updating the work out day exercise."
		});
	}
};

function convertDurationToWeeks(duration) {
	// duration examples: "6 months", "4 months", "1 month", "12 days"
	// const parts = duration.toLowerCase().split(" ");

	// if (parts.length < 2) return 0; // invalid format

	const value = parseInt(parts[0], 10);
	const unit = parts[1];

	if (isNaN(value)) return 0;

	if (unit.startsWith("month") || unit.startsWith("Month") || unit.startsWith("Months")) {
		return value * 4; // approx 4 weeks per month
	} else if (unit.startsWith("day")) {
		return Math.floor(value / 7); // convert days to weeks
	} else if (unit.startsWith("week")) {
		return value; // already in weeks
	}
	return 0;
}

exports.createWeek = async (req, res) => {
	try {
		const schema = joi.object({
			numberOfWeeks: joi.number().min(1).required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const { numberOfWeeks } = req.body;

		// Count already existing weeks
		const existingWeeks = await Week.count();

		// Calculate new target total weeks
		const targetWeeks = existingWeeks + numberOfWeeks;
		console.log(existingWeeks);
		console.log(targetWeeks);

		let createdWeeks = [];
		for (let i = existingWeeks + 1; i <= targetWeeks; i++) {
			const week = await Week.create({
				title: `Week ${i}`
			});

			// Create 5 workout days for each week
			const days = Array.from({ length: 5 }, (_, idx) => ({
				dayNumber: idx + 1,
				title: `Workout Day ${idx + 1}`,
				weekId: week.id
			}));

			await WorkoutDays.bulkCreate(days);
			encryptHelper(week);
			createdWeeks.push(week);
		}

		return res.status(200).send({
			message: `${numberOfWeeks} new week(s) created successfully`,
			totalWeeks: targetWeeks,
			data: createdWeeks
		});
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while creating weeks."
		});
	}
};

// utils/durationHelper.js
function convertDurationToWeeks(duration) {
	const [value, unit] = duration.split(" ");
	const num = parseInt(value, 10);

	if (unit.includes("month")) {
		// Assume average month = 30.44 days (Gregorian calendar average)
		const days = num * 30.44;
		return Math.round(days / 7); // round to nearest full week
	}

	if (unit.includes("week")) {
		return num;
	}

	if (unit.includes("day")) {
		return Math.ceil(num / 7);
	}

	return 0;
}
