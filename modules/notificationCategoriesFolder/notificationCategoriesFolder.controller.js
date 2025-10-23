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

// Remove the habit-specific conditions from the database query
// We'll handle these filters in post-processing like the progress filters

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

		let whereConditions = {};
		let orConditions = [];

		// Handle mutually exclusive user status categories with OR logic
		const statusCategories = categoriesArray.filter(
			(cat) => cat === "Inactive users" || cat === "Active users" || cat === "Trial Users"
		);

		if (statusCategories.length > 0) {
			const statusConditions = [];

			for (const category of statusCategories) {
				switch (category) {
					case "Inactive users":
						statusConditions.push({ isActive: "N" });
						break;
					case "Active users":
						statusConditions.push({ isActive: "Y" });
						break;
					case "Trial Users":
						statusConditions.push({
							"$userPlans.plan.isFree$": "Y"
						});
						break;
				}
			}

			if (statusConditions.length > 0) {
				orConditions.push({ [Op.or]: statusConditions });
			}
		}

		// Check if we have any filters that require post-processing
		const hasProgressFilter = categoriesArray.some(
			(cat) => cat.includes("Progress less than") || cat.includes("Progress more than")
		);

		const hasHabitFilter = categoriesArray.some(
			(cat) => cat === "User not doing workout" || cat === "User not posting meals"
		);

		// Build final where conditions
		if (orConditions.length > 0) {
			whereConditions = {
				[Op.and]: [{ isdeleted: "N" }, { [Op.or]: orConditions }]
			};
		} else {
			whereConditions = {
				isdeleted: "N"
			};
		}

		const users = await db.users.findAll({
			where: whereConditions,
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

		// Filter users based on progress and habit criteria if needed
		let filteredUsers = users;
		if (hasProgressFilter || hasHabitFilter) {
			filteredUsers = await filterUsersByProgressAndHabits(users, categoriesArray);
		}

		encryptHelper(filteredUsers);
		res.status(200).json({
			success: true,
			data: filteredUsers
		});
	} catch (error) {
		console.error("Error fetching users by categories:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

// Helper function to calculate and filter by progress and specific habits
async function filterUsersByProgressAndHabits(users, categoriesArray) {
	const progressCategories = categoriesArray.filter(
		(cat) => cat.includes("Progress less than") || cat.includes("Progress more than")
	);

	const habitCategories = categoriesArray.filter(
		(cat) => cat === "User not doing workout" || cat === "User not posting meals"
	);

	if (progressCategories.length === 0 && habitCategories.length === 0) return users;

	return users.filter((user) => {
		// Check progress filters
		if (progressCategories.length > 0) {
			const overallProgress = calculateOverallProgress(user);
			let progressMatch = false;

			for (const category of progressCategories) {
				if (category.includes("Progress less than 50") && overallProgress < 50) {
					progressMatch = true;
				}
				if (category.includes("Progress less than 70") && overallProgress < 70) {
					progressMatch = true;
				}
				if (category.includes("Progress more than 90") && overallProgress > 90) {
					progressMatch = true;
				}
			}

			if (progressCategories.length > 0 && !progressMatch) {
				return false;
			}
		}

		// Check habit-specific filters
		if (habitCategories.length > 0) {
			let habitMatch = false;

			for (const category of habitCategories) {
				let habitType;
				if (category === "User not doing workout") {
					habitType = "workout";
				} else if (category === "User not posting meals") {
					habitType = "meal";
				}

				if (habitType) {
					const habitProgress = calculateHabitProgress(user, habitType);
					if (habitProgress < 50) {
						habitMatch = true;
					}
				}
			}

			if (habitCategories.length > 0 && !habitMatch) {
				return false;
			}
		}

		return true;
	});
}

// Function to calculate overall progress for all mandatory habits
function calculateOverallProgress(user) {
	if (!user.habits || user.habits.length === 0) return 0;

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
}

// Function to calculate progress for specific habit types (workout/meal)
function calculateHabitProgress(user, habitType) {
	if (!user.habits || user.habits.length === 0) return 0;

	// Find habits that match the type (workout or meal)
	const matchingHabits = user.habits.filter((habit) => habit.name.toLowerCase().includes(habitType.toLowerCase()));

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
}

module.exports = {
	createFolder,
	getFolders,
	updateFolder,
	deleteFolder,
	getUsersByCategories
};
