const Joi = require("joi");
const db = require("../../models");
const { Op, Sequelize } = require("sequelize");
const { sequelize } = require("../../models");

const Users = db.users;
const Dishes = db.dishes;
const CommunityPosts = db.communityPosts;
const HabitsCompletions = db.habitsCompletions;
const WorkoutsCompletions = db.workoutsCompletions;

exports.getDashboardStats = async (req, res) => {
	try {
		// Get current date and date from 1 month ago
		const now = new Date();
		const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

		// Get total users count
		const totalUsers = await Users.count({
			where: { isActive: "Y" }
		});

		// Get users count from 1 month ago for growth calculation
		const usersOneMonthAgo = await Users.count({
			where: {
				isActive: "Y",
				createdAt: {
					[Op.lt]: oneMonthAgo
				}
			}
		});

		// Calculate user growth percentage
		const userGrowthPercentage =
			usersOneMonthAgo > 0
				? (((totalUsers - usersOneMonthAgo) / usersOneMonthAgo) * 100).toFixed(1)
				: totalUsers > 0
				? 100
				: 0;

		// Get active recipes count
		const activeRecipes = await Dishes.count({
			where: { isActive: "Y" }
		});

		// Get recipes count from 1 month ago for growth calculation
		const recipesOneMonthAgo = await Dishes.count({
			where: {
				isActive: "Y",
				createdAt: {
					[Op.lt]: oneMonthAgo
				}
			}
		});

		// Calculate recipe growth percentage
		const recipeGrowthPercentage =
			recipesOneMonthAgo > 0
				? (((activeRecipes - recipesOneMonthAgo) / recipesOneMonthAgo) * 100).toFixed(1)
				: activeRecipes > 0
				? 100
				: 0;

		// Get community posts count
		const communityPosts = await CommunityPosts.count({
			where: { isActive: "Y" }
		});

		// Get community posts count from 1 week ago for growth calculation
		const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const postsOneWeekAgo = await CommunityPosts.count({
			where: {
				isActive: "Y",
				createdAt: {
					[Op.lt]: oneWeekAgo
				}
			}
		});

		// Calculate community posts growth percentage
		const postsGrowthPercentage =
			postsOneWeekAgo > 0
				? (((communityPosts - postsOneWeekAgo) / postsOneWeekAgo) * 100).toFixed(1)
				: communityPosts > 0
				? 100
				: 0;

		// Get active and inactive users
		const activeUsers = await Users.count({
			where: { isActive: "Y", id: { [Op.ne]: 1 } }
		});

		const inactiveUsers = await Users.count({
			where: { isActive: "N" }
		});

		const totalUsersCount = activeUsers + inactiveUsers;

		// Get app usage statistics (users who completed habits or workouts in last 30 days)
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		const activeUsersWithActivity = await Users.count({
			where: { isActive: "Y", id: { [Op.ne]: 1 } },
			include: [
				{
					model: HabitsCompletions,
					where: {
						createdAt: {
							[Op.gte]: thirtyDaysAgo
						}
					},
					required: false
				},
				{
					model: WorkoutsCompletions,
					where: {
						createdAt: {
							[Op.gte]: thirtyDaysAgo
						}
					},
					required: false
				}
			]
		});

		const response = {
			totalUsers: totalUsers,
			userGrowthPercentage: parseFloat(userGrowthPercentage),
			activeRecipes: activeRecipes,
			recipeGrowthPercentage: parseFloat(recipeGrowthPercentage),
			communityPosts: communityPosts,
			postsGrowthPercentage: parseFloat(postsGrowthPercentage),
			userStats: {
				active: activeUsers,
				inactive: inactiveUsers,
				total: totalUsersCount
			},
			appUsage: {
				active: activeUsersWithActivity,
				inactive: totalUsers - activeUsersWithActivity
			}
		};

		res.status(200).json({
			message: "Dashboard statistics retrieved successfully",
			data: response
		});
	} catch (err) {
		console.error("Dashboard stats error:", err);
		res.status(500).json({
			message: "Internal server error while retrieving dashboard statistics"
		});
	}
};

exports.getMonthlyUserGrowth = async (req, res) => {
	try {
		// Get user growth data for the last 12 months
		const monthlyGrowth = [];
		const now = new Date();

		for (let i = 11; i >= 0; i--) {
			const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

			const userCount = await Users.count({
				where: {
					isActive: "Y",
					createdAt: {
						[Op.between]: [monthStart, monthEnd]
					}
				}
			});
			const inactiveuserCount = await Users.count({
				where: {
					isActive: "N",
					createdAt: {
						[Op.between]: [monthStart, monthEnd]
					}
				}
			});
			monthlyGrowth.push({
				month: monthStart.toLocaleDateString("en-US", { month: "short" }),
				active: userCount,
				inactive: inactiveuserCount
			});
		}

		res.status(200).json({
			message: "Monthly user growth data retrieved successfully",
			data: monthlyGrowth
		});
	} catch (err) {
		console.error("Monthly user growth error:", err);
		res.status(500).json({
			message: "Internal server error while retrieving monthly user growth"
		});
	}
};

exports.getUserActivityStats = async (req, res) => {
	try {
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// Get daily active users for the last 30 days
		const dailyActivity = [];
		for (let i = 29; i >= 0; i--) {
			const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			const dayEnd = new Date(now.getTime() - (i - 1) * 24 * 60 * 60 * 1000);

			const activeUsers = await Users.count({
				distinct: true, // avoid duplicate counts when joins are used
				col: "id",
				where: {
					isActive: "Y",
					[Op.or]: [{ updatedAt: { [Op.between]: [dayStart, dayEnd] } }]
				},
				include: [
					{
						model: HabitsCompletions,
						required: false,
						where: {
							createdAt: { [Op.between]: [dayStart, dayEnd] }
						}
					},
					{
						model: WorkoutsCompletions,
						required: false,
						where: {
							createdAt: { [Op.between]: [dayStart, dayEnd] }
						}
					}
				]
			});

			dailyActivity.push({
				date: dayStart.toISOString().split("T")[0],
				activeUsers: activeUsers
			});
		}

		res.status(200).json({
			message: "User activity statistics retrieved successfully",
			data: dailyActivity
		});
	} catch (err) {
		console.error("User activity stats error:", err);
		res.status(500).json({
			message: "Internal server error while retrieving user activity statistics"
		});
	}
};
