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
		const { name, categories } = req.body;

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

		const updateData = {};
		if (name) updateData.name = name;
		if (categories) updateData.categories = JSON.stringify(categories);

		await folder.update(updateData);

		res.status(200).json({
			success: true,
			message: "Folder updated successfully",
			data: {
				...folder.toJSON(),
				categories: categories ? categories : JSON.parse(folder.categories)
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

		// Handle progress-based categories with OR logic
		const progressCategories = categoriesArray.filter(
			(cat) => cat.includes("Progress less than") || cat.includes("Progress more than")
		);

		if (progressCategories.length > 0) {
			const progressConditions = [];

			for (const category of progressCategories) {
				let percentage;
				if (category.includes("less than 50")) {
					percentage = { [Op.lt]: 50 };
				} else if (category.includes("less than 70")) {
					percentage = { [Op.lt]: 70 };
				} else if (category.includes("more than 90")) {
					percentage = { [Op.gt]: 90 };
				}

				if (percentage) {
					progressConditions.push({
						[Op.and]: [{ "$habits.mandatory$": "Y" }, { "$habitsCompletions.status$": "Completed" }]
					});
				}
			}

			if (progressConditions.length > 0) {
				orConditions.push({ [Op.or]: progressConditions });
			}
		}

		// Handle habit-specific categories with OR logic
		const habitCategories = categoriesArray.filter(
			(cat) => cat === "User not doing workout" || cat === "User not posting meals"
		);

		if (habitCategories.length > 0) {
			const habitConditions = [];

			for (const category of habitCategories) {
				let habitName;
				if (category === "User not doing workout") {
					habitName = "workout";
				} else if (category === "User not posting meals") {
					habitName = "meal updates";
				}

				if (habitName) {
					habitConditions.push({
						[Op.and]: [
							{ "$habits.name$": habitName },
							{
								[Op.not]: {
									"$habitsCompletions.status$": "Completed"
								}
							}
						]
					});
				}
			}

			if (habitConditions.length > 0) {
				orConditions.push({ [Op.or]: habitConditions });
			}
		}

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
			attributes: ["id", "firstName", "lastName", "email", "phoneNo", "isActive"]
		});

		encryptHelper(users);
		res.status(200).json({
			success: true,
			data: users
		});
	} catch (error) {
		console.error("Error fetching users by categories:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

module.exports = {
	createFolder,
	getFolders,
	updateFolder,
	deleteFolder,
	getUsersByCategories
};
