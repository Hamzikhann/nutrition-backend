const cron = require("node-cron");
const db = require("../models");
const Notifications = require("./notificationsHelper"); // Adjust path to your notifications helper

const User = db.users;
const UserPlan = db.userPlans;
const Plan = db.plans;
const Role = db.roles;

class CronJobs {
	static init() {
		// Trial User Deactivation - Every 30 seconds
		cron.schedule("5 0 * * *", CronJobs.deactivateExpiredTrials);
		// cron.schedule("*/10 * * * * *", CronJobs.deactivateExpiredTrials);

		// Plan User Deactivation - Run daily at 12:10 AM (after midnight)
		cron.schedule("10 0 * * *", CronJobs.deactivateExpiredPlans);
		// cron.schedule("*/10 * * * * *", CronJobs.deactivateExpiredPlans);

		// BMR Reduction - Run daily at 12:15 AM (after midnight)
		cron.schedule("15 0 * * *", CronJobs.reduceBmrMonthly);

		console.log("All cron jobs initialized");
	}

	static calculateExpiryDate(activatedAt, duration) {
		const createdDate = new Date(activatedAt);
		const expiryDate = new Date(createdDate);

		const [value, unit] = duration.split(" ");
		const numValue = parseInt(value, 10);

		const unitLower = unit.toLowerCase();

		if (unitLower.includes("month")) {
			const targetMonth = expiryDate.getMonth() + numValue;
			expiryDate.setMonth(targetMonth);

			// Handle month overflow (e.g., Jan 31 + 1 month)
			if (expiryDate.getMonth() !== targetMonth % 12) {
				expiryDate.setDate(0); // Last day of previous month
			}
		} else if (unitLower.includes("week")) {
			expiryDate.setDate(expiryDate.getDate() + numValue * 7);
		} else if (unitLower.includes("day")) {
			expiryDate.setDate(expiryDate.getDate() + numValue);
		} else if (unitLower.includes("year")) {
			expiryDate.setFullYear(expiryDate.getFullYear() + numValue);
		}

		expiryDate.setHours(23, 59, 59, 999);
		return expiryDate;
	}

	static async deactivateExpiredTrials() {
		try {
			console.log("Starting trial user deactivation cron job...");

			const threeDaysAgo = new Date();
			threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
			threeDaysAgo.setHours(0, 0, 0, 0);

			// FIXED: Remove the problematic UserPlan include condition
			const expiredTrialUsers = await User.findAll({
				where: {
					activatedAt: {
						[db.Sequelize.Op.lte]: threeDaysAgo
					},
					isActive: "Y"
				},
				include: [
					{
						model: UserPlan,
						required: false // Just check if they have any UserPlan, don't filter by id
					},
					{
						model: Role,
						where: {
							title: {
								[db.Sequelize.Op.notIn]: ["Administrator", "Subadmin"]
							}
						}
					}
				]
			});

			console.log(`Found ${expiredTrialUsers.length} users with expired trials`);

			// FIXED: Filter in JavaScript to find users WITHOUT UserPlans
			const usersWithoutPlans = expiredTrialUsers.filter((user) => !user.UserPlans || user.UserPlans.length === 0);

			console.log(`Found ${usersWithoutPlans.length} trial users without plans to deactivate`);

			const deactivationPromises = usersWithoutPlans.map(async (user) => {
				// Deactivate the user
				await user.update({ isActive: "N" });

				// Send notification about trial expiration
				await Notifications.sendFcmNotification(
					user.id,
					"Trial Period Ended",
					"Your 3-day trial period has ended. Upgrade to a premium plan to continue accessing all features.",
					"trial_expired",
					{
						deactivationDate: new Date().toISOString(),
						reason: "trial_ended",
						upgradeUrl: "/plans"
					}
				);

				console.log(`Deactivated trial user ${user.email} and sent notification`);
			});

			await Promise.all(deactivationPromises);
			console.log(`Successfully deactivated ${usersWithoutPlans.length} trial users and sent notifications`);
		} catch (error) {
			console.error("Error in trial user deactivation cron job:", error);
		}
	}

	static async deactivateExpiredPlans() {
		try {
			console.log("Starting expired plan user deactivation cron job...");

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const usersWithPlans = await User.findAll({
				where: {
					isActive: "Y"
				},
				include: [
					{
						model: UserPlan,
						required: true,
						include: [
							{
								model: Plan,
								attributes: ["duration", "name"],
								required: true
							}
						]
					},
					{
						model: Role,
						where: {
							title: {
								[db.Sequelize.Op.notIn]: ["Administrator", "Subadmin"]
							}
						}
					}
				]
			});
			console.log(usersWithPlans);
			let expiredUsersCount = 0;
			const deactivationPromises = [];
			console.log(`Found ${usersWithPlans.length} users with plans to check`);
			for (const user of usersWithPlans) {
				const userPlan = user.userPlans[0];
				const planDuration = userPlan.plan.duration;
				const planName = userPlan.plan.name || "Your plan";
				const expiryDate = CronJobs.calculateExpiryDate(user.activatedAt, planDuration);

				if (expiryDate < today) {
					deactivationPromises.push(async () => {
						// Deactivate the user
						await user.update({ isActive: "N" });

						// Send notification about plan expiration
						await Notifications.sendFcmNotification(
							user.id,
							"Plan Expired",
							`Your ${planName} has expired. Renew your subscription to continue accessing all features.`,
							"plan_expired",
							{
								deactivationDate: new Date().toISOString(),
								reason: "plan_expired",
								planName: planName,
								planDuration: planDuration,
								renewUrl: "/plans" // You can add your renew URL here
							}
						);

						console.log(`Deactivated user ${user.email} (plan expired) and sent notification`);
					});
					expiredUsersCount++;
				}
			}

			// Execute all deactivation and notification promises
			await Promise.all(deactivationPromises.map((promise) => promise()));
			console.log(`Successfully deactivated ${expiredUsersCount} users with expired plans and sent notifications`);
		} catch (error) {
			console.error("Error in expired plan user deactivation cron job:", error);
		}
	}

	static async reduceBmrMonthly() {
		try {
			console.log("Starting daily BMR reduction check for monthly anniversaries...");

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// Get all active users (excluding admins/subadmins)
			const activeUsers = await User.findAll({
				where: {
					isActive: "Y"
				},
				include: [
					{
						model: Role,
						where: {
							title: {
								[db.Sequelize.Op.notIn]: ["Administrator", "Subadmin"]
							}
						}
					}
				],
				attributes: ["id", "activatedAt", "bmr", "email", "firstName", "lastName", "lastBmrReductionDate"]
			});

			let bmrUpdatedCount = 0;
			const updatePromises = [];

			for (const user of activeUsers) {
				const referenceDate = user.lastBmrReductionDate
					? new Date(user.lastBmrReductionDate)
					: new Date(user.activatedAt);

				referenceDate.setHours(0, 0, 0, 0);

				// Calculate days since last reduction (or since creation)
				const daysSinceReduction = Math.floor((today - referenceDate) / (1000 * 60 * 60 * 24));

				// Check if 30 days have passed
				if (daysSinceReduction >= 30) {
					// Calculate how many 30-day cycles have passed
					const cyclesPassed = Math.floor(daysSinceReduction / 30);
					const totalReduction = cyclesPassed * 100;
					const newBmr = Math.max(0, (user.bmr || 0) - totalReduction);

					updatePromises.push(
						user.update({
							bmr: newBmr,
							lastBmrReductionDate: today
						})
					);
					bmrUpdatedCount++;

					console.log(
						`Reduced BMR for user ${user.email} by ${totalReduction} (${cyclesPassed} cycles of 30 days): ${user.bmr} → ${newBmr}`
					);

					// Send notification about BMR reduction
					// if (cyclesPassed > 0) {
					// 	await Notifications.sendFcmNotification(
					// 		user.id,
					// 		"BMR Updated",
					// 		`Your BMR has been adjusted by ${totalReduction} calories as part of your monthly progress update.`,
					// 		"bmr_updated",
					// 		{
					// 			oldBmr: user.bmr,
					// 			newBmr: newBmr,
					// 			reductionAmount: totalReduction,
					// 			updateDate: today.toISOString()
					// 		}
					// 	);
					// }
				}
			}

			await Promise.all(updatePromises);
			console.log(`Successfully updated BMR for ${bmrUpdatedCount} users`);
		} catch (error) {
			console.error("Error in BMR reduction cron job:", error);
		}
	}

	// Utility function to calculate months difference between two dates
	static getMonthsDifference(date1, date2) {
		const d1 = new Date(date1);
		const d2 = new Date(date2);

		let months = (d2.getFullYear() - d1.getFullYear()) * 12;
		months += d2.getMonth() - d1.getMonth();

		// Adjust if day of month hasn't been reached yet
		if (d2.getDate() < d1.getDate()) {
			months--;
		}

		return Math.max(0, months);
	}

	// Utility function to get next reduction date for logging
	static getNextReductionDate(lastReductionDate) {
		const nextDate = new Date(lastReductionDate);
		nextDate.setDate(nextDate.getDate() + 30);
		return nextDate.toISOString().split("T")[0];
	}
}

module.exports = CronJobs;
