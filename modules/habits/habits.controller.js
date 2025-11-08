const Joi = require("joi");
const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const Op = require("sequelize").Op;
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");
const Sequelize = db.sequelize;
// const {Sequelize}
const Habits = db.habits;
const HabitCompletions = db.habitsCompletions;
const User = db.users;

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

			if (!req.file) {
				return res.status(400).send({
					message: "Image is required"
				});
			}

			const s3Key = await uploadFileToSpaces(req.file, `habits`);

			const habit = await Habits.create({
				name,
				description,
				mandatory,
				createdBy: crypto.decrypt(req.userId),
				image: s3Key,

				userId: crypto.decrypt(req.userId)
			});
			encryptHelper(habit);
			return res.status(200).send({
				message: "Habit created successfully",
				data: habit
			});
		}
	} catch (err) {
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
				userId: [1, userId]
			};
		}

		// Get user creation date to calculate overall progress
		const user = await User.findByPk(userId);
		const userCreatedAt = user ? new Date(user.createdAt) : new Date();

		// Calculate days since user joined
		const daysSinceUserJoined = Math.max(1, Math.ceil((new Date() - userCreatedAt) / (1000 * 60 * 60 * 24)));

		// Get today's date range (use the same timezone as your data)
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const todayEnd = new Date();
		todayEnd.setHours(23, 59, 59, 999);

		// Get all active habits
		const habits = await Habits.findAll({
			where: whereClause,
			include: [{ model: HabitCompletions, required: false }]
		});

		// Filter only mandatory habits for progress calculation
		const mandatoryHabits = habits.filter((habit) => habit.mandatory === "Y" || habit.mandatory === "true");
		const totalMandatoryHabits = mandatoryHabits.length;

		// Get all completions for mandatory habits by this user
		const allCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((habit) => habit.id),
				userId: userId,
				status: "Completed"
			}
		});

		// CORRECTED: Get today's completions - use createdAt instead of updatedAt
		const todayCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((habit) => habit.id),
				userId: userId,
				status: "Completed",
				// Use createdAt to track when the habit was actually completed
				createdAt: {
					[Op.between]: [todayStart, todayEnd]
				}
			}
		});

		// Calculate progress metrics
		const totalPossibleCompletions = totalMandatoryHabits * daysSinceUserJoined;
		const totalCompleted = allCompletions.length;

		// CORRECTED: Today's completed should be based on unique habit completions today
		const todayCompleted = todayCompletions.length;
		console.log(totalPossibleCompletions);
		console.log(todayCompleted);
		console.log(typeof totalPossibleCompletions);
		console.log(typeof todayCompleted);

		const overallPercentage =
			totalPossibleCompletions > 0 ? Math.round((totalCompleted / totalPossibleCompletions) * 100) : 0;

		// CORRECTED: Today's percentage should be based on mandatory habits count
		const todayPercentage = totalMandatoryHabits > 0 ? Math.round((todayCompleted / totalMandatoryHabits) * 100) : 0;

		encryptHelper(habits);

		// Return only the progress summary, not embedded in each habit
		return res.status(200).send({
			message: "Habit progress summary",
			data: {
				habits: habits,
				progress: {
					overall: {
						completed: totalCompleted,
						total: totalPossibleCompletions,
						percentage: Math.min(overallPercentage, 100)
					},
					today: {
						completed: todayCompleted,
						total: totalMandatoryHabits, // This should be 11, not 100
						percentage: Math.min(todayPercentage, 100)
					}
				},
				summary: {
					totalHabits: habits.length,
					mandatoryHabits: totalMandatoryHabits,
					daysSinceJoined: daysSinceUserJoined,
					todayDate: new Date().toISOString().split("T")[0],
					// Add debug info
					debug: {
						todayCompletionsCount: todayCompletions.length,
						todayStart: todayStart,
						todayEnd: todayEnd,
						mandatoryHabitIds: mandatoryHabits.map((h) => h.id)
					}
				}
			}
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while fetching habit progress."
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
		}

		const habitId = crypto.decrypt(req.body.id);
		const userId = crypto.decrypt(req.userId);

		// Check if habit exists and user has access
		const habit = await Habits.findOne({
			where: {
				id: habitId,
				isActive: "Y"
			}
		});

		if (!habit) {
			return res.status(404).send({
				message: "Habit not found or you don't have access to it"
			});
		}

		// Use database date function (uses database timezone)
		const existingCompletion = await HabitCompletions.findOne({
			where: {
				habitId: habitId,
				userId: userId,
				[Op.and]: [Sequelize.where(Sequelize.fn("DATE", Sequelize.col("updatedAt")), Sequelize.fn("CURDATE"))]
			}
		});

		if (existingCompletion) {
			return res.status(400).send({
				message: "Habit already completed today"
			});
		}

		// Create a new completion record
		const completion = await HabitCompletions.create({
			habitId: habitId,
			userId: userId,
			status: "Completed",
			updatedAt: new Date()
		});

		return res.status(200).send({
			message: "Habit marked as completed for today"
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while updating habit status."
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
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const { id } = value;
		const habitId = crypto.decrypt(id);
		let userId = crypto.decrypt(req.userId);

		// find habit first
		const habit = await Habits.findOne({ where: { id: habitId, isActive: "Y" } });
		if (!habit) {
			return res.status(404).send({ message: "Habit not found" });
		}

		// Role-based check
		if (req.role === "User") {
			// Restrict users from deleting admin-created habits (userId = 1)
			if (habit.userId === 1) {
				return res.status(403).send({
					message: "You are not allowed to delete admin-created habits"
				});
			}

			// Also ensure user can delete only their own habits
			if (habit.userId !== parseInt(userId)) {
				return res.status(403).send({
					message: "You can only delete your own habits"
				});
			}
		}

		// perform soft delete
		await Habits.update({ isActive: "N" }, { where: { id: habitId } });

		return res.status(200).send({
			message: "Habit deleted successfully"
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while deleting the habit."
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required(),
			name: Joi.string().required(),
			description: Joi.string().required(),
			image: Joi.string().optional().allow("").allow(null),
			mandatory: Joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { id, name, description, mandatory } = value;

			const getHabit = await Habits.findOne({
				where: {
					id: crypto.decrypt(id)
				}
			});

			if (req.file) {
				var s3Key = await uploadFileToSpaces(req.file, "habits");
			}
			const habit = await Habits.update(
				{
					name,
					description,
					mandatory,
					image: req.file ? s3Key : getHabit.image
				},
				{
					where: {
						id: crypto.decrypt(id)
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
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.listv2 = async (req, res) => {
	try {
		let userId = crypto.decrypt(req.userId);
		let whereClause = {};
		let whereClauseCompletions = {};

		if (userId == 1) {
			whereClause = {
				isActive: "Y"
			};

			whereClauseCompletions = {
				isActive: "Y"
			};
		} else {
			whereClause = {
				isActive: "Y",
				userId: [1, userId]
			};
			whereClauseCompletions = {
				isActive: "Y",
				userId: userId
			};
		}

		// Get user creation date
		const user = await User.findByPk(userId);
		const userCreatedAt = user ? new Date(user.createdAt) : new Date();

		// Calculate days since user joined
		const daysSinceUserJoined = Math.max(1, Math.ceil((new Date() - userCreatedAt) / (1000 * 60 * 60 * 24)));

		// Get all active habits with their percentages
		const habits = await Habits.findAll({
			where: whereClause,
			include: [
				{
					model: HabitCompletions,
					where: whereClauseCompletions,
					required: false
				}
			]
		});

		// Filter mandatory habits and calculate total possible percentage
		const mandatoryHabits = habits.filter((habit) => habit.mandatory === "Y" || habit.mandatory === "true");
		const totalMandatoryHabits = mandatoryHabits.length;

		// Calculate total daily possible percentage (sum of all mandatory habit percentages)
		const totalDailyPossiblePercentage = mandatoryHabits.reduce((total, habit) => {
			return total + parseFloat(habit.percentage || 0);
		}, 0);

		// FIXED: Get today's completions using database date function
		const todayCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((habit) => habit.id),
				userId: userId,
				status: "Completed",
				// Use literal for proper date comparison
				[Op.and]: [db.Sequelize.literal(`DATE(createdAt) = CURDATE()`)]
			}
		});

		// Get all completions for mandatory habits
		const allCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((habit) => habit.id),
				userId: userId,
				status: "Completed"
			}
		});

		// Calculate progress based on percentages

		// TODAY'S PROGRESS: Calculate achieved percentage for today
		let todayAchievedPercentage = 0;
		const todayCompletedHabitIds = new Set();

		todayCompletions.forEach((completion) => {
			// Avoid counting duplicate completions for same habit
			if (!todayCompletedHabitIds.has(completion.habitId)) {
				const habit = mandatoryHabits.find((h) => h.id === completion.habitId);
				if (habit) {
					todayAchievedPercentage += parseFloat(habit.percentage || 0);
					todayCompletedHabitIds.add(completion.habitId);
				}
			}
		});

		// OVERALL PROGRESS: Calculate total possible and achieved percentages across all days
		const totalPossiblePercentage = totalDailyPossiblePercentage * daysSinceUserJoined;
		let totalAchievedPercentage = 0;
		const completedHabitMap = new Map(); // To track unique habit completions per day

		// Group completions by date to avoid counting same habit multiple times per day
		allCompletions.forEach((completion) => {
			const completionDate = new Date(completion.createdAt).toISOString().split("T")[0];
			const key = `${completion.habitId}-${completionDate}`;

			if (!completedHabitMap.has(key)) {
				const habit = mandatoryHabits.find((h) => h.id === completion.habitId);
				if (habit) {
					totalAchievedPercentage += parseFloat(habit.percentage || 0);
					completedHabitMap.set(key, true);
				}
			}
		});

		// Calculate percentages
		const todayPercentage =
			totalDailyPossiblePercentage > 0
				? Math.min(Math.round((todayAchievedPercentage / totalDailyPossiblePercentage) * 100), 100)
				: 0;

		const overallPercentage =
			totalPossiblePercentage > 0
				? Math.min(Math.round((totalAchievedPercentage / totalPossiblePercentage) * 100), 100)
				: 0;

		encryptHelper(habits);

		return res.status(200).send({
			message: "Habit progress summary",
			data: {
				habits: habits,
				progress: {
					overall: {
						completed: allCompletions.length,
						totalPossibleCompletions: totalMandatoryHabits * daysSinceUserJoined,
						achievedPercentage: Math.round(totalAchievedPercentage * 100) / 100,
						totalPossiblePercentage: Math.round(totalPossiblePercentage * 100) / 100,
						percentage: overallPercentage
					},
					today: {
						completed: todayCompletions.length,
						total: totalMandatoryHabits,
						achievedPercentage: Math.round(todayAchievedPercentage * 100) / 100,
						totalPossiblePercentage: Math.round(totalDailyPossiblePercentage * 100) / 100,
						percentage: todayPercentage
					}
				},
				summary: {
					totalHabits: habits.length,
					mandatoryHabits: totalMandatoryHabits,
					daysSinceJoined: daysSinceUserJoined,
					todayDate: new Date().toISOString().split("T")[0],
					habitPercentages: mandatoryHabits.map((habit) => ({
						id: habit.id,
						name: habit.name,
						percentage: habit.percentage
					})),
					debug: {
						todayCompletionsCount: todayCompletions.length,
						todayCompletions: todayCompletions.map((c) => ({
							id: c.id,
							habitId: c.habitId,
							createdAt: c.createdAt
						})),
						mandatoryHabitIds: mandatoryHabits.map((h) => h.id),
						totalDailyPossiblePercentage: totalDailyPossiblePercentage
					}
				}
			}
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while fetching habit progress."
		});
	}
};

exports.getHabitProgressGraph = async (req, res) => {
	try {
		const schema = Joi.object({
			userId: Joi.string().required(),
			timezone: Joi.string().optional()
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const userId = crypto.decrypt(req.body.userId);
		const timezone = req.body.timezone || "UTC"; // Default to UTC if not provided

		// Get user to fetch createdAt date
		const user = await User.findByPk(userId);
		if (!user) {
			return res.status(404).send({ message: "User not found" });
		}
		const startDate = new Date(user.createdAt);
		const endDate = new Date();

		// Get user's mandatory habits
		const habits = await Habits.findAll({
			where: {
				isActive: "Y",
				userId: 1, // global + personal
				mandatory: "Y"
			}
		});

		const habitIds = habits.map((h) => h.id);
		const totalHabits = habits.length;

		if (totalHabits === 0) {
			return res.status(200).send({
				message: "No mandatory habits found",
				data: []
			});
		}

		// Query all completions from startDate to endDate
		const completions = await HabitCompletions.findAll({
			where: {
				habitId: habitIds,
				userId,
				status: "Completed",
				updatedAt: { [Op.between]: [startDate, endDate] }
			}
		});

		let responseData = [];

		// Loop through each day from startDate to endDate
		const currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			const dayStart = new Date(currentDate);
			dayStart.setHours(0, 0, 0, 0);
			const dayEnd = new Date(currentDate);
			dayEnd.setHours(23, 59, 59, 999);

			const dayCompletionsCount = completions.filter((c) => {
				const date = new Date(c.updatedAt);
				return date >= dayStart && date <= dayEnd;
			}).length;

			const percentage = totalHabits > 0 ? Math.round((dayCompletionsCount / totalHabits) * 100) : 0;

			responseData.push({
				date: currentDate.toISOString().split("T")[0],
				completed: dayCompletionsCount,
				total: totalHabits,
				percentage: Math.min(percentage, 100)
			});

			currentDate.setDate(currentDate.getDate() + 1);
		}

		return res.status(200).send({
			message: "Habit progress data retrieved successfully",
			data: responseData
		});
	} catch (err) {
		res.status(500).send({
			message: err.message || "Some error occurred while retrieving habit progress graph."
		});
	}
};
