const Joi = require("joi");
const db = require("../../models");
const emails = require("../../utils/emails");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const Op = require("sequelize").Op;
const { uploadFileToS3 } = require("../../utils/awsServises");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");
// const deepClone = require("deep-clone");

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
		console.log(req.body);

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const { name, description, mandatory } = value;
			console.log(req.userId);

			if (!req.file) {
				return res.status(400).send({
					message: "Image is required"
				});
			}

			const s3Key = await uploadFileToSpaces(req.file, `habits`);
			console.log(s3Key);

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
				userId: [1, userId]
			};
		}

		// Get user creation date to calculate overall progress
		const user = await User.findByPk(userId);
		const userCreatedAt = user ? new Date(user.createdAt) : new Date();

		// Calculate days since user joined
		const daysSinceUserJoined = Math.max(1, Math.ceil((new Date() - userCreatedAt) / (1000 * 60 * 60 * 24)));

		// Get today's date range
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const todayEnd = new Date();
		todayEnd.setHours(23, 59, 59, 999);

		// Get all active habits (only mandatory ones count for progress)
		const habits = await Habits.findAll({
			where: whereClause,
			include: [{ model: HabitCompletions, required: false }]
		});

		// Filter only mandatory habits for progress calculation
		const mandatoryHabits = habits.filter((habit) => habit.mandatory === "Y");
		const totalMandatoryHabits = mandatoryHabits.length;

		// Get all completions for mandatory habits by this user
		const allCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((habit) => habit.id),
				userId: userId,
				status: "Completed"
			}
		});

		// Get today's completions for mandatory habits
		const todayCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((habit) => habit.id),
				userId: userId,
				status: "Completed",
				updatedAt: {
					[Op.between]: [todayStart, todayEnd]
				}
			}
		});

		// Calculate progress metrics
		const totalPossibleCompletions = totalMandatoryHabits * daysSinceUserJoined;
		const totalCompleted = allCompletions.length;
		const todayCompleted = todayCompletions.length;

		const overallPercentage =
			totalPossibleCompletions > 0 ? Math.round((totalCompleted / totalPossibleCompletions) * 100) : 0;

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
						percentage: Math.min(overallPercentage, 100) // Cap at 100%
					},
					today: {
						completed: todayCompleted,
						total: totalMandatoryHabits,
						percentage: Math.min(todayPercentage, 100) // Cap at 100%
					}
				},
				summary: {
					totalHabits: habits.length,
					mandatoryHabits: totalMandatoryHabits,
					daysSinceJoined: daysSinceUserJoined,
					todayDate: new Date().toISOString().split("T")[0]
				}
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while fetching habit progress."
		});
	}
};
// Optional helper function for streak calculation
async function calculateStreak(habitId, userId) {
	const completions = await HabitCompletions.findAll({
		where: {
			habitId: habitId,
			userId: userId,
			isCompleted: true
		},
		order: [["completedAt", "DESC"]]
	});

	let streak = 0;
	let currentDate = new Date();

	for (let i = 0; i < completions.length; i++) {
		const completionDate = new Date(completions[i].completedAt);
		completionDate.setHours(0, 0, 0, 0);
		currentDate.setHours(0, 0, 0, 0);

		const diffDays = Math.floor((currentDate - completionDate) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			streak++;
			currentDate.setDate(currentDate.getDate() - 1);
		} else if (diffDays === 1) {
			streak++;
			currentDate.setDate(currentDate.getDate() - 1);
		} else {
			break;
		}
	}

	return streak;
}

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

		// Check if already completed today
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const todayEnd = new Date();
		todayEnd.setHours(23, 59, 59, 999);

		const existingCompletion = await HabitCompletions.findOne({
			where: {
				habitId: habitId,
				userId: userId,
				updatedAt: {
					[Op.between]: [todayStart, todayEnd]
				}
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

		// Update habit streak (optional enhancement)

		// Get updated progress information

		// encryptHelper(habitWithProgress);
		return res.status(200).send({
			message: "Habit marked as completed for today"
		});
	} catch (err) {
		console.log(err);
		emails.errorEmail(req, err);
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
		emails.errorEmail(req, err);
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
		} else {
			const { id } = value;
			const habit = await Habits.update(
				{
					isActive: "N"
				},
				{
					where: {
						id: crypto.decrypt(id)
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
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reassigning the booking."
		});
	}
};

exports.listv2 = async (req, res) => {
	try {
		console.log(req.userId);
		let userId = crypto.decrypt(req.userId);
		let whereClause = {};

		if (userId == 1) {
			whereClause = {
				isActive: "Y"
			};
		} else {
			whereClause = {
				isActive: "Y",
				userId: [1, userId] // global + personal habits
			};
		}

		// Get user creation date
		const user = await User.findByPk(userId);
		const userCreatedAt = user ? new Date(user.createdAt) : new Date();

		// Calculate days since user joined
		const daysSinceUserJoined = Math.max(1, Math.ceil((new Date() - userCreatedAt) / (1000 * 60 * 60 * 24)));

		// Today’s date range
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const todayEnd = new Date();
		todayEnd.setHours(23, 59, 59, 999);

		// Get all active habits
		const habits = await Habits.findAll({
			where: whereClause,
			include: [{ model: HabitCompletions, where: { userId }, required: false }]
		});

		// Only mandatory habits count for progress
		const mandatoryHabits = habits.filter((h) => h.mandatory === "true");
		const totalMandatoryHabits = mandatoryHabits.length;

		// Prepare percentage map (default 0 if missing)
		const habitPercentages = {};
		mandatoryHabits.forEach((h) => {
			habitPercentages[h.id] = h.percentage || 0;
		});

		// All completions
		const allCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((h) => h.id),
				userId: userId,
				status: "Completed"
			}
		});

		// Today’s completions
		const todayCompletions = await HabitCompletions.findAll({
			where: {
				habitId: mandatoryHabits.map((h) => h.id),
				userId: userId,
				status: "Completed",
				updatedAt: {
					[Op.between]: [todayStart, todayEnd]
				}
			}
		});

		// --- Weighted progress ---
		let todayProgress = 0;
		todayCompletions.forEach((c) => {
			todayProgress += habitPercentages[c.habitId] || 0;
		});

		let overallProgress = 0;
		allCompletions.forEach((c) => {
			overallProgress += habitPercentages[c.habitId] || 0;
		});

		const totalPossibleOverall = daysSinceUserJoined * 100; // each day = 100 points
		const overallPercentage = totalPossibleOverall > 0 ? Math.round((overallProgress / totalPossibleOverall) * 100) : 0;

		const todayPercentage = Math.round(todayProgress); // already weighted %

		encryptHelper(habits);

		return res.status(200).send({
			message: "Habit progress summary",
			data: {
				habits,
				progress: {
					overall: {
						completed: overallProgress,
						total: totalPossibleOverall,
						percentage: Math.min(overallPercentage, 100)
					},
					today: {
						completed: todayProgress,
						total: 100,
						percentage: Math.min(todayPercentage, 100)
					}
				},
				summary: {
					totalHabits: habits.length,
					mandatoryHabits: totalMandatoryHabits,
					daysSinceJoined: daysSinceUserJoined,
					todayDate: new Date().toISOString().split("T")[0]
				}
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while fetching habit progress."
		});
	}
};

exports.getHabitProgressGraph = async (req, res) => {
	try {
		const schema = Joi.object({
			userId: Joi.string().required(),
			type: Joi.string().valid("monthly", "weekly").required()
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const userId = crypto.decrypt(req.body.userId);
		const { type } = req.body;

		// Get user's mandatory habits
		const habits = await Habits.findAll({
			where: {
				isActive: "Y",
				userId: [1, userId], // global + personal
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

		// Dates
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();
		const monthStart = new Date(currentYear, currentMonth, 1);
		const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
		weekStart.setHours(0, 0, 0, 0);
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 6); // Sunday
		weekEnd.setHours(23, 59, 59, 999);

		// Query completions once for month/week
		let completions = [];
		if (type === "monthly") {
			completions = await HabitCompletions.findAll({
				where: {
					habitId: habitIds,
					userId,
					status: "Completed",
					updatedAt: { [Op.between]: [monthStart, monthEnd] }
				}
			});
		} else if (type === "weekly") {
			completions = await HabitCompletions.findAll({
				where: {
					habitId: habitIds,
					userId,
					status: "Completed",
					updatedAt: { [Op.between]: [weekStart, weekEnd] }
				}
			});
		}

		let responseData = [];

		// --- Monthly ---
		if (type === "monthly") {
			const weeksInMonth = Math.ceil((monthEnd.getDate() - monthStart.getDate() + 1) / 7);

			for (let week = 0; week < weeksInMonth; week++) {
				const weekStartDate = new Date(monthStart);
				weekStartDate.setDate(monthStart.getDate() + week * 7);
				const weekEndDate = new Date(weekStartDate);
				weekEndDate.setDate(weekStartDate.getDate() + 6);
				if (weekEndDate > monthEnd) weekEndDate.setTime(monthEnd.getTime());

				const weekCompletionsCount = completions.filter((c) => {
					const date = new Date(c.updatedAt);
					return date >= weekStartDate && date <= weekEndDate;
				}).length;

				const totalPossible =
					totalHabits * Math.min(7, Math.ceil((weekEndDate - weekStartDate) / (1000 * 60 * 60 * 24)) + 1);
				const percentage = totalPossible > 0 ? Math.round((weekCompletionsCount / totalPossible) * 100) : 0;

				responseData.push({
					week: week + 1,
					completed: weekCompletionsCount,
					total: totalPossible,
					percentage: Math.min(percentage, 100),
					startDate: weekStartDate.toISOString().split("T")[0],
					endDate: weekEndDate.toISOString().split("T")[0]
				});
			}
		}

		// --- Weekly ---
		if (type === "weekly") {
			for (let day = 0; day < 7; day++) {
				const dayDate = new Date(weekStart);
				dayDate.setDate(weekStart.getDate() + day);
				const dayStart = new Date(dayDate);
				dayStart.setHours(0, 0, 0, 0);
				const dayEnd = new Date(dayDate);
				dayEnd.setHours(23, 59, 59, 999);

				const dayCompletionsCount = completions.filter((c) => {
					const date = new Date(c.updatedAt);
					return date >= dayStart && date <= dayEnd;
				}).length;

				const percentage = totalHabits > 0 ? Math.round((dayCompletionsCount / totalHabits) * 100) : 0;

				responseData.push({
					day: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
					date: dayDate.toISOString().split("T")[0],
					completed: dayCompletionsCount,
					total: totalHabits,
					percentage: Math.min(percentage, 100)
				});
			}
		}

		return res.status(200).send({
			message: `Habit progress ${type} data retrieved successfully`,
			data: responseData
		});
	} catch (err) {
		console.log(err);
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while retrieving habit progress graph."
		});
	}
};
