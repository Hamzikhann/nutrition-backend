const db = require("../../models");
const { Op } = require("sequelize");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const createFolder = async (req, res) => {
	try {
		let { name, users } = req.body;

		if (!name || !users || !Array.isArray(users)) {
			return res.status(400).json({
				success: false,
				message: "Folder name and users array are required"
			});
		}

		users.forEach((userId) => {
			userId = crypto.decrypt(userId);
		});

		const folder = await db.notificationCategoriesFolder.create({
			name,
			users: JSON.stringify(users) // Store array of user IDs as JSON string
		});

		res.status(201).json({
			success: true,
			message: "Folder created successfully",
			data: folder
		});
	} catch (error) {
		console.error("Error creating folder:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

const getFolders = async (req, res) => {
	try {
		const folders = await db.notificationCategoriesFolder.findAll({
			where: { isActive: "Y", isdeleted: "N" },
			order: [["createdAt", "DESC"]]
		});

		encryptHelper(folders);

		res.status(200).json({
			success: true,
			data: folders
		});
	} catch (error) {
		console.error("Error fetching folders:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

const updateFolder = async (req, res) => {
	try {
		const { id } = req.params;
		let { name, users } = req.body;

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "Folder ID is required"
			});
		}

		const folder = await db.notificationCategoriesFolder.findByPk(id);
		if (!folder) {
			return res.status(404).json({
				success: false,
				message: "Folder not found"
			});
		}

		if (users && !Array.isArray(users)) {
			return res.status(400).json({
				success: false,
				message: "Users must be an array"
			});
		}

		if (users) {
			users.forEach((userId, index) => {
				users[index] = crypto.decrypt(userId);
			});
		}

		const updateData = {};
		if (name) updateData.name = name;
		if (users) updateData.users = JSON.stringify(users);

		await folder.update(updateData);

		res.status(200).json({
			success: true,
			message: "Folder updated successfully",
			data: {
				...folder.toJSON(),
				users: users ? users : JSON.parse(folder.users || "[]")
			}
		});
	} catch (error) {
		console.error("Error updating folder:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

const deleteFolder = async (req, res) => {
	try {
		const { id } = req.params;

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "Folder ID is required"
			});
		}

		const folder = await db.notificationCategoriesFolder.findByPk(id);
		if (!folder) {
			return res.status(404).json({
				success: false,
				message: "Folder not found"
			});
		}

		await folder.update({ isdeleted: "Y" });

		res.status(200).json({
			success: true,
			message: "Folder deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting folder:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

const getUsersByCategories = async (req, res) => {
	try {
		const { categories } = req.body;

		if (!categories) {
			return res.status(400).json({
				success: false,
				message: "Categories is required"
			});
		}

		// Normalize categories to array format
		let categoriesArray = [];
		if (Array.isArray(categories)) {
			categoriesArray = categories;
		} else if (typeof categories === "string") {
			categoriesArray = [categories];
		} else {
			return res.status(400).json({
				success: false,
				message: "Categories must be a string or array"
			});
		}

		// Fetch users with all required data in a single query
		const users = await db.users.findAll({
			where: {
				isdeleted: "N"
			},
			include: [
				{
					model: db.habits,
					as: "habits",
					where: { isActive: "Y" },
					required: false
				},
				{
					model: db.habitsCompletions,
					as: "habitsCompletions",
					where: { isActive: "Y" },
					required: false
				},
				{
					model: db.userPlans,
					as: "userPlans",
					where: { isActive: "Y" },
					required: false,
					include: [
						{
							model: db.plans,
							as: "plan",
							where: { isActive: "Y" },
							required: false
						}
					]
				}
			],
			attributes: ["id", "firstName", "lastName", "email", "phoneNo", "isActive", "createdAt"]
		});

		// Calculate progress for each user once (cache it)
		const usersWithProgress = users.map((user) => {
			const overallProgress = calculateOverallProgress(user);
			const workoutProgress = calculateSpecificHabitProgress(user, ["workout", "exercise"]);
			const mealProgress = calculateSpecificHabitProgress(user, ["meal", "food", "breakfast", "lunch", "dinner"]);
			const isTrialUser = checkIfTrialUser(user);

			return {
				...user.toJSON(),
				overallProgress,
				workoutProgress,
				mealProgress,
				isTrialUser
			};
		});

		// Filter users based on categories (OR logic between categories)
		const filteredUsers = usersWithProgress.filter((user) => {
			// If multiple categories, user should match AT LEAST ONE
			if (categoriesArray.length > 1) {
				return categoriesArray.some((category) => userMatchesCategory(user, category));
			}
			// If single category, user should match it
			return userMatchesCategory(user, categoriesArray[0]);
		});

		// Encrypt and return
		encryptHelper(filteredUsers);
		res.status(200).json({
			success: true,
			data: filteredUsers,
			count: filteredUsers.length,
			message: `Found ${filteredUsers.length} users matching the criteria`
		});
	} catch (error) {
		console.error("Error fetching users by categories:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

// Helper function to check if user is a trial user
function checkIfTrialUser(user) {
	if (!user.userPlans || user.userPlans.length === 0) return false;

	// Find the current active plan
	const currentPlan = user.userPlans.find((up) => up.isActive === "Y");
	if (!currentPlan || !currentPlan.plan) return false;

	return currentPlan.plan.isFree === "Y";
}

// Check if a user matches a specific category
function userMatchesCategory(user, category) {
	// For "Inactive users" category, we only check isActive condition
	if (category === "Inactive users") {
		return user.isActive === "N";
	}

	// For all other categories, user must be active (isActive: "Y")
	if (user.isActive !== "Y") {
		return false;
	}

	switch (category) {
		case "Active users":
			return true; // Already filtered by isActive: "Y"

		case "Trial Users":
			return user.isTrialUser;

		case "Progress less than 50":
			return user.overallProgress < 50;

		case "Progress less than 70":
			return user.overallProgress < 70;

		case "Progress more than 90":
			return user.overallProgress > 90;

		case "User not doing workout":
			// Check for workout-related habits based on your data
			if (!user.habits || user.habits.length === 0) return true;

			// Look for workout-related habit names
			const workoutKeywords = ["workout", "exercise"];
			const hasWorkoutHabit = user.habits.some((habit) =>
				workoutKeywords.some((keyword) => habit.name.toLowerCase().includes(keyword.toLowerCase()))
			);

			// If no workout habit exists, consider as "not doing workout"
			if (!hasWorkoutHabit) return true;

			// If workout habit exists, check completion percentage
			return user.workoutProgress < 50;

		case "User not posting meals":
			// Check for meal-related habits based on your data
			if (!user.habits || user.habits.length === 0) return true;

			// Look for meal-related habit names
			const mealKeywords = ["meal", "breakfast", "dinner", "food", "lunch"];
			const hasMealHabit = user.habits.some((habit) =>
				mealKeywords.some((keyword) => habit.name.toLowerCase().includes(keyword.toLowerCase()))
			);

			// If no meal habit exists, consider as "not posting meals"
			if (!hasMealHabit) return true;

			// If meal habit exists, check completion percentage
			return user.mealProgress < 50;

		default:
			return false;
	}
}

// Function to calculate overall progress for all mandatory habits
// Function to calculate overall progress for all mandatory habits
function calculateOverallProgress(user) {
	try {
		if (!user.habits || user.habits.length === 0) return 0;

		// Filter only mandatory habits
		const mandatoryHabits = user.habits.filter((habit) => habit.mandatory === "Y");
		if (mandatoryHabits.length === 0) return 0;

		const userCreatedAt = new Date(user.createdAt);
		const today = new Date();
		const daysSinceJoin = Math.max(1, Math.ceil((today - userCreatedAt) / (1000 * 60 * 60 * 24)));

		let totalExpectedCompletions = 0;
		let totalActualCompletions = 0;

		mandatoryHabits.forEach((habit) => {
			totalExpectedCompletions += daysSinceJoin;

			if (user.habitsCompletions) {
				const habitCompletions = user.habitsCompletions.filter(
					(completion) => completion.habitId === habit.id && completion.status === "Completed"
				);
				totalActualCompletions += habitCompletions.length;
			}
		});

		if (totalExpectedCompletions === 0) return 0;

		const progressPercentage = (totalActualCompletions / totalExpectedCompletions) * 100;
		return Math.min(100, Math.round(progressPercentage));
	} catch (error) {
		console.error("Error calculating overall progress:", error);
		return 0;
	}
}

// Function to calculate progress for specific habit keywords
function calculateSpecificHabitProgress(user, keywords) {
	try {
		if (!user.habits || user.habits.length === 0) return 0;

		// Find MANDATORY habits that contain any of the keywords
		const matchingHabits = user.habits.filter((habit) => {
			// Only consider mandatory habits
			if (habit.mandatory !== "Y") return false;

			const habitName = habit.name.toLowerCase();
			return keywords.some((keyword) => habitName.includes(keyword.toLowerCase()));
		});

		if (matchingHabits.length === 0) return 0;

		const userCreatedAt = new Date(user.createdAt);
		const today = new Date();
		const daysSinceJoin = Math.max(1, Math.ceil((today - userCreatedAt) / (1000 * 60 * 60 * 24)));

		let totalExpectedCompletions = 0;
		let totalActualCompletions = 0;

		matchingHabits.forEach((habit) => {
			totalExpectedCompletions += daysSinceJoin;

			if (user.habitsCompletions) {
				const habitCompletions = user.habitsCompletions.filter(
					(completion) => completion.habitId === habit.id && completion.status === "Completed"
				);
				totalActualCompletions += habitCompletions.length;
			}
		});

		if (totalExpectedCompletions === 0) return 0;

		const progressPercentage = (totalActualCompletions / totalExpectedCompletions) * 100;
		return Math.min(100, Math.round(progressPercentage));
	} catch (error) {
		console.error("Error calculating specific habit progress:", error);
		return 0;
	}
}

module.exports = {
	createFolder,
	getFolders,
	updateFolder,
	deleteFolder,
	getUsersByCategories
};
