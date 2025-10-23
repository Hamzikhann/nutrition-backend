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
const User = db.users;

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
								}
							],
							attributes: {
								exclude: ["createdAt", "updatedAt", "exerciseId", "weekId", "workoutDayId"]
							}
						},
						{
							model: WorkoutsCompletions,
							required: false
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
				order: { [db.Sequelize.Op.lte]: durationWeeks } // numeric comparison
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
								}
							],
							attributes: {
								exclude: ["createdAt", "updatedAt", "exerciseId", "weekId", "workoutDayId"]
							}
						},
						{
							model: WorkoutsCompletions,
							required: false,
							include: [
								{
									model: User
								}
							]
						}
					],
					attributes: {
						exclude: ["createdAt", "updatedAt"]
					}
				}
			],
			attributes: {
				exclude: ["createdAt", "updatedAt", "planId"]
			},
			order: [["order", "ASC"]], // make sure weeks come in sequence
			limit: durationWeeks // fetch only up to N weeks
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
			console.log("user id", crypto.decrypt(req.userId));
			console.log("workout day id", crypto.decrypt(id));

			const workOutDay = await WorkoutDays.findOne({
				where: {
					id: crypto.decrypt(id)
				}
			});
			if (!workOutDay) {
				console.log("not done");

				return res.status(400).send({
					message: "Work out day exercise not found"
				});
			}
			let findWorkoutCompleted = await WorkoutsCompletions.findOne({
				where: {
					workoutDayId: crypto.decrypt(id)
				}
			});

			if (findWorkoutCompleted) {
				console.log("already");

				return res.status(400).send({
					message: "Work out day already completed"
				});
			}
			let updateWorkoutCompleted = await WorkoutsCompletions.create({
				status: "Completed",
				userId: crypto.decrypt(req.userId), //req.userId
				workoutDayId: crypto.decrypt(id)
			});
			console.log(updateWorkoutCompleted);
			return res.status(200).send({
				message: "Work out day exercise updated successfully"
			});
		}
	} catch (err) {
		console.log(err);
		return res.status(400).send({
			message: err.message || "Some error occurred while updating the work out day exercise."
		});
	}
};

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

		// ✅ Determine starting and ending week numbers
		// If no existing weeks, start from 0
		const startWeek = existingWeeks === 0 ? 0 : existingWeeks;
		const targetWeeks = startWeek + numberOfWeeks;

		let createdWeeks = [];

		for (let i = startWeek; i < targetWeeks; i++) {
			const week = await Week.create({
				title: `Week ${i}`,
				order: i
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
		console.error("Error creating weeks:", err);
		return res.status(400).send({
			message: err.message || "Some error occurred while creating weeks."
		});
	}
};

// utils/durationHelper.js
function convertDurationToWeeks(duration) {
	const [value, unit] = duration.split(" ");
	const num = parseInt(value, 10);

	if (unit.startsWith("month") || unit.startsWith("Month") || unit.startsWith("Months")) {
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

exports.update = async (req, res) => {
	try {
		const schema = joi.object({
			id: joi.string().required(),
			weekId: joi.string().optional(),
			workoutDayId: joi.string().optional(),
			exerciseId: joi.string().optional(),
			sets: joi.string().optional(),
			reps: joi.string().optional()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { id, weekId, workoutDayId, exerciseId, sets, reps } = value;
			const decryptedId = crypto.decrypt(id);

			const workOutDayExercise = await WorkOutDayExercises.findOne({
				where: { id: decryptedId }
			});
			if (!workOutDayExercise) {
				return res.status(400).send({
					message: "Workout day exercise not found"
				});
			}

			const updateData = {};
			if (weekId) {
				const week = await Week.findOne({
					where: { id: crypto.decrypt(weekId) }
				});
				if (!week) {
					return res.status(400).send({
						message: "Week not found"
					});
				}
				updateData.weekId = crypto.decrypt(weekId);
			}
			if (workoutDayId) {
				const workoutDays = await WorkoutDays.findOne({
					where: { id: crypto.decrypt(workoutDayId) }
				});
				if (!workoutDays) {
					return res.status(400).send({
						message: "Workout day not found"
					});
				}
				updateData.workoutDayId = crypto.decrypt(workoutDayId);
			}
			if (exerciseId) {
				const exercise = await Exercise.findOne({
					where: { id: crypto.decrypt(exerciseId) }
				});
				if (!exercise) {
					return res.status(400).send({
						message: "Exercise not found"
					});
				}
				updateData.exerciseId = crypto.decrypt(exerciseId);
			}
			if (sets) updateData.sets = sets;
			if (reps) updateData.reps = reps;

			const [updateCount] = await WorkOutDayExercises.update(updateData, { where: { id: decryptedId } });

			if (updateCount) {
				return res.status(200).send({
					message: "Workout day exercise updated successfully"
				});
			} else {
				return res.status(400).send({
					message: "Failed to update workout day exercise"
				});
			}
		}
	} catch (err) {
		return res.status(400).send({
			message: err.message || "Some error occurred while updating the workout day exercise."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const schema = joi.object({
			id: joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const id = crypto.decrypt(req.body.id);

		const [update] = await WorkOutDayExercises.update({ isActive: "N" }, { where: { id } });

		if (update) {
			return res.status(200).send({ message: "Workout Deleted", success: true });
		} else {
			return res.status(404).send({ message: "Workout not found" });
		}
	} catch (error) {
		console.error("Error deleting workout:", error);
		return res.status(500).send({
			message: error.message || "Some error occurred while deleting workout."
		});
	}
};

// exports.create = async (req, res) => {
// 	const t = await sequelize.transaction();

// 	try {
// 		const schema = joi.object({
// 			email: joi.string().required(),
// 			phoneNo: joi.string().required(),
// 			amount: joi.string().required(),
// 			paymentMethod: joi.string().required(),
// 			currency: joi.string().required(),
// 			paymentIntentId: joi.string().required(),
// 			planId: joi.string().required(),
// 			userId: joi.string().required(),
// 			isUpgrade: joi.boolean().optional().default(false) // Add this field to distinguish upgrade vs renewal
// 		});

// 		const { error } = schema.validate(req.body);
// 		if (error) {
// 			await t.rollback();
// 			return res.status(400).send({ message: error.details[0].message });
// 		}

// 		const { amount, paymentMethod, currency, paymentIntentId, isUpgrade } = req.body;
// 		console.log(req.body);

// 		let userId = crypto.decrypt(req.body.userId);
// 		console.log(userId);
// 		if (userId == null) {
// 			return res.status(400).send({
// 				success: false,
// 				message: "User not found"
// 			});
// 		}

// 		let existedUser = await User.findOne({
// 			where: { id: userId }
// 		});

// 		if (!existedUser) {
// 			return res.status(400).send({
// 				success: false,
// 				message: "User not found"
// 			});
// 		}

// 		const getPlans = await Plans.findOne({
// 			where: {
// 				id: crypto.decrypt(req.body.planId)
// 			}
// 		});

// 		if (!getPlans) {
// 			return res.status(400).send({
// 				success: false,
// 				message: "Plan not found"
// 			});
// 		}

// 		// Check if user has an existing active plan
// 		const existingUserPlan = await UserPlans.findOne({
// 			where: {
// 				userId: userId,
// 				isActive: 'Y'
// 			},
// 			order: [['createdAt', 'DESC']] // Get the latest active plan
// 		});

// 		let newDuration;
// 		let userPlanData;

// 		if (existingUserPlan && !isUpgrade) {
// 			// CASE 1: RENEWAL - Add new duration to existing duration
// 			const currentDuration = existingUserPlan.duration;
// 			const newPlanDuration = getPlans.duration;

// 			// Calculate total duration (existing + new)
// 			newDuration = addDurations(currentDuration, newPlanDuration);

// 			// Update existing user plan with new duration
// 			userPlanData = await UserPlans.update(
// 				{
// 					duration: newDuration,
// 					planId: crypto.decrypt(req.body.planId),
// 					updatedAt: new Date()
// 				},
// 				{
// 					where: {
// 						id: existingUserPlan.id
// 					},
// 					transaction: t
// 				}
// 			);

// 		} else if (existingUserPlan && isUpgrade) {
// 			// CASE 2: UPGRADE - Deactivate old plan and create new one

// 			// Deactivate the current active plan
// 			await UserPlans.update(
// 				{
// 					isActive: 'N',
// 					deactivatedAt: new Date()
// 				},
// 				{
// 					where: {
// 						id: existingUserPlan.id,
// 						userId: userId
// 					},
// 					transaction: t
// 				}
// 			);

// 			// Create new user plan with the upgraded plan duration
// 			newDuration = getPlans.duration;
// 			userPlanData = await UserPlans.create(
// 				{
// 					userId: userId,
// 					duration: newDuration,
// 					planId: crypto.decrypt(req.body.planId),
// 					isActive: 'Y',
// 					previousPlanId: existingUserPlan.planId // Track previous plan for reference
// 				},
// 				{
// 					transaction: t
// 				}
// 			);

// 		} else {
// 			// CASE 3: FIRST TIME PURCHASE - Create new plan
// 			newDuration = getPlans.duration;
// 			userPlanData = await UserPlans.create(
// 				{
// 					userId: userId,
// 					duration: newDuration,
// 					planId: crypto.decrypt(req.body.planId),
// 					isActive: 'Y'
// 				},
// 				{
// 					transaction: t
// 				}
// 			);
// 		}

// 		// Handle file upload if present
// 		if (req.file) {
// 			const file = req.file;
// 			var fileUrl = await uploadFileToSpaces(file, "payments");
// 		}

// 		// Update user payment status
// 		const updateUser = await User.update(
// 			{
// 				isPayment: "Y"
// 			},
// 			{
// 				where: {
// 					id: userId
// 				},
// 				transaction: t
// 			}
// 		);

// 		// Create payment record
// 		const payment = await Payment.create(
// 			{
// 				amount,
// 				paymentMethod,
// 				currency,
// 				paymentIntentId,
// 				image: fileUrl ? fileUrl : null,
// 				userId,
// 				planId: crypto.decrypt(req.body.planId),
// 				isUpgrade: isUpgrade || false,
// 				userPlanId: userPlanData.id || existingUserPlan?.id
// 			},
// 			{
// 				transaction: t
// 			}
// 		);

// 		await t.commit();

// 		console.log(existedUser.id);
// 		const getUser = await User.findOne({
// 			where: {
// 				id: existedUser.id
// 			},
// 			include: [
// 				{
// 					model: Roles
// 				},
// 				{
// 					model: UserPlans,
// 					where: { isActive: 'Y' },
// 					required: false,
// 					include: [{ model: Plans }]
// 				}
// 			]
// 		});

// 		encryptHelper(getUser);

// 		return res.status(200).json({
// 			success: true,
// 			message: isUpgrade ? "Plan upgraded successfully" : "Payment & User plan processed successfully",
// 			data: getUser
// 		});
// 	} catch (error) {
// 		await t.rollback();
// 		console.error("Error in create:", error);

// 		return res.status(500).json({
// 			success: false,
// 			message: error.message
// 		});
// 	}
// };

// // Helper function to add durations (e.g., "2 months" + "2 months" = "4 months")
// function addDurations(duration1, duration2) {
// 	// Extract numbers and units
// 	const match1 = duration1.match(/(\d+)\s*(\w+)/);
// 	const match2 = duration2.match(/(\d+)\s*(\w+)/);

// 	if (!match1 || !match2) {
// 		throw new Error('Invalid duration format');
// 	}

// 	const num1 = parseInt(match1[1]);
// 	const unit1 = match1[2].toLowerCase();
// 	const num2 = parseInt(match2[1]);
// 	const unit2 = match2[2].toLowerCase();

// 	// Convert to common unit if needed, or assume same unit
// 	if (unit1 !== unit2) {
// 		// For simplicity, assume both are in the same unit for now
// 		// You can add conversion logic here if needed
// 		throw new Error('Duration units must be the same for addition');
// 	}

// 	const total = num1 + num2;
// 	return `${total} ${unit1}`;
// }

// // Helper function to convert duration to weeks (for your list controller)
// function convertDurationToWeeks(duration) {
// 	const match = duration.match(/(\d+)\s*(\w+)/);
// 	if (!match) {
// 		throw new Error('Invalid duration format');
// 	}

// 	const num = parseInt(match[1]);
// 	const unit = match[2].toLowerCase();

// 	switch(unit) {
// 		case 'week':
// 		case 'weeks':
// 			return num;
// 		case 'month':
// 		case 'months':
// 			return num * 4; // Assuming 4 weeks per month
// 		case 'year':
// 		case 'years':
// 			return num * 52; // 52 weeks per year
// 		case 'day':
// 		case 'days':
// 			return Math.ceil(num / 7); // Convert days to weeks
// 		default:
// 			throw new Error('Unknown duration unit: ' + unit);
// 	}
// }
