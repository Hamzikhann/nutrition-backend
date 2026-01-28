const cron = require("node-cron");
const db = require("../models");
const Notifications = require("./notificationsHelper"); // Adjust path to your notifications helper

const User = db.users;
const UserPlan = db.userPlans;
const Plan = db.plans;
const Role = db.roles;

class CronJobs {
	static init() {
		//testCron();
		// Cron Jobs
		cron.schedule("*/10 * * * * *", CronJobs.testCron);

		// Trial User Deactivation - Every 30 seconds
		// cron.schedule("5 0 * * *", CronJobs.deactivateExpiredTrials);
		cron.schedule("*/10 * * * * *", CronJobs.deactivateExpiredTrials);

		// Plan User Deactivation - Run daily at 12:10 AM (after midnight)
		// cron.schedule("10 0 * * *", CronJobs.deactivateExpiredPlans);
		cron.schedule("*/10 * * * * *", CronJobs.deactivateExpiredPlans);

		// BMR Reduction - Run daily at 12:15 AM (after midnight)
		// cron.schedule("15 0 * * *", CronJobs.reduceBmrMonthly);

		console.log("All cron jobs initialized");
	}

	// static init() {
	// 	console.log("🕐 Initializing cron jobs...");

	// 	// 🟢 Trial User Deactivation
	// 	// Runs DAILY at 12:05 AM
	// 	cron.schedule("5 0 * * *", async () => {
	// 		console.log("⏰ Trial deactivation cron triggered");
	// 		await CronJobs.deactivateExpiredTrials();
	// 	});

	// 	// 🟢 Plan User Deactivation
	// 	// Runs DAILY at 12:10 AM
	// 	cron.schedule("10 0 * * *", async () => {
	// 		console.log("⏰ Plan deactivation cron triggered");
	// 		await CronJobs.deactivateExpiredPlans();
	// 	});

	// 	// 🟢 BMR Monthly Reduction
	// 	// Runs DAILY at 12:15 AM
	// 	cron.schedule("15 0 * * *", async () => {
	// 		console.log("⏰ BMR reduction cron triggered");
	// 		await CronJobs.reduceBmrMonthly();
	// 	});

	// 	console.log("✅ All cron jobs initialized (after 12:00 AM)");
	// }

	static testCron() {
		console.log("Cron job executed");
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
			console.log("========== STARTING TRIAL DEACTIVATION CRON JOB ==========");
			console.log(`Current server time: ${new Date().toString()}`);
			console.log(`Current server time (ISO): ${new Date().toISOString()}`);

			// Calculate cutoff date (3 days ago, start of day)
			const threeDaysAgo = new Date();
			threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
			threeDaysAgo.setHours(0, 0, 0, 0);

			console.log("\n--- DATE CALCULATIONS ---");
			console.log(`Three days ago (local): ${threeDaysAgo.toString()}`);
			console.log(`Three days ago (ISO): ${threeDaysAgo.toISOString()}`);
			console.log(`Three days ago (Date object):`, threeDaysAgo);

			// For debugging: Check your specific user
			const testUserActivatedAt = new Date("2026-01-18T13:30:46Z");
			console.log("\n--- DEBUG: Checking your specific user (ID: 430) ---");
			console.log(`User activatedAt: ${testUserActivatedAt.toString()}`);
			console.log(`User activatedAt (ISO): ${testUserActivatedAt.toISOString()}`);
			console.log(`Should user be included? ${testUserActivatedAt <= threeDaysAgo ? "YES" : "NO"}`);
			console.log(
				`Difference in days: ${Math.floor((threeDaysAgo - testUserActivatedAt) / (1000 * 60 * 60 * 24))} days`
			);

			console.log("\n--- EXECUTING QUERY ---");
			console.log("Query conditions:");
			console.log("1. activatedAt <= ", threeDaysAgo.toISOString());
			console.log("2. isActive = 'Y'");
			console.log("3. isdeleted = 'N'");
			console.log("4. roleId = 2");
			console.log("5. id NOT IN (SELECT DISTINCT userId FROM userPlans)");

			// First, let's check if the user has any plans
			console.log("\n--- CHECKING USER PLANS FOR USER ID: 430 ---");
			try {
				const userPlanCheck = await db.sequelize.query(
					`SELECT COUNT(*) as planCount FROM userPlans WHERE userId = 430`,
					{ type: db.sequelize.QueryTypes.SELECT }
				);
				console.log(`User 430 has ${userPlanCheck[0].planCount} user plans`);
			} catch (planError) {
				console.log("Error checking user plans:", planError.message);
			}

			const expiredTrialUsers = await User.findAll({
				where: {
					activatedAt: {
						[db.Sequelize.Op.lte]: threeDaysAgo
					},
					isActive: "Y",
					isdeleted: "N",
					roleId: 2,
					// 🔑 CRITICAL FIX: users with NO plans
					id: {
						[db.Sequelize.Op.notIn]: db.Sequelize.literal(`(SELECT DISTINCT userId FROM userPlans)`)
					}
				},
				// Add logging to see raw SQL
				logging: (sql) => {
					console.log("\n--- RAW SQL QUERY ---");
					console.log(sql);
					console.log("--- END RAW SQL ---\n");
				}
			});

			console.log(`\n--- QUERY RESULTS ---`);
			console.log(`Found ${expiredTrialUsers.length} trial users eligible for deactivation`);

			if (expiredTrialUsers.length > 0) {
				console.log("\n--- LIST OF EXPIRED USERS ---");
				expiredTrialUsers.forEach((user, index) => {
					console.log(`[${index + 1}] ID: ${user.id}, Email: ${user.email}, Activated: ${user.activatedAt}`);
				});
			} else {
				console.log("No users found. Possible issues:");
				console.log("1. Date calculation problem");
				console.log("2. Users might have user plans");
				console.log("3. Users not active or deleted");
				console.log("4. Wrong roleId");

				// Let's check what users DO match some conditions
				console.log("\n--- CHECKING PARTIAL MATCHES ---");

				// Check users matching date condition only
				const dateMatchUsers = await User.findAll({
					where: {
						activatedAt: {
							[db.Sequelize.Op.lte]: threeDaysAgo
						},
						roleId: 2
					},
					attributes: ["id", "email", "activatedAt", "isActive", "isdeleted"],
					limit: 5
				});

				console.log(`Users matching date condition (sample of ${dateMatchUsers.length}):`);
				dateMatchUsers.forEach((user) => {
					console.log(
						`ID: ${user.id}, Email: ${user.email}, Active: ${user.isActive}, Deleted: ${user.isdeleted}, Activated: ${user.activatedAt}`
					);
				});
			}

			if (!expiredTrialUsers.length) {
				console.log("\nNo users to deactivate. Ending job.");
				return;
			}

			console.log("\n--- PROCESSING DEACTIVATIONS ---");
			for (const user of expiredTrialUsers) {
				console.log(`Processing user ${user.id} (${user.email})...`);

				// await user.update({
				//     isActive: "N"
				// });

				// OPTIONAL: notification
				try {
					// await Notifications.sendFcmNotification(
					//     user.id,
					//     "Trial Period Ended",
					//     "Your 3-day free trial has ended. Upgrade to continue.",
					//     "trial_expired"
					// );
					console.log(`  ✓ Sent notification to user ${user.id}`);
				} catch (notifError) {
					console.log(`  ✗ Failed to send notification to user ${user.id}:`, notifError.message);
				}

				console.log(`  ✓ Deactivated trial user: ${user.email}`);
			}

			console.log(`\n========== SUCCESS: Deactivated ${expiredTrialUsers.length} trial users ==========`);
		} catch (error) {
			console.error("\n❌ ERROR in trial user deactivation cron job:");
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);

			// Log additional error details for Sequelize errors
			if (error.name === "SequelizeDatabaseError") {
				console.error("SQL Error details:", error.parent?.message);
			}
		}
	}

	static async deactivateExpiredPlans() {
		try {
			console.log("Starting expired plan user deactivation cron job...");

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const usersWithPlans = await User.findAll({
				where: {
					isActive: "Y",
					isdeleted: "N",
					roleId: 2
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
					}
					// {
					// 	model: Role,
					// 	where: {
					// 		title: {
					// 			[db.Sequelize.Op.notIn]: ["Administrator", "Subadmin"]
					// 		}
					// 	}
					// }
				]
			});
			// console.log(usersWithPlans);
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

			const MIN_BMR = 1300;

			// Get all active users (excluding admins/subadmins) with BMR > 1300
			const activeUsers = await User.findAll({
				where: {
					isActive: "Y",
					bmr: {
						[db.Sequelize.Op.gt]: MIN_BMR
					}
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

				const daysSinceReduction = Math.floor((today - referenceDate) / (1000 * 60 * 60 * 24));

				if (daysSinceReduction >= 30) {
					const cyclesPassed = Math.floor(daysSinceReduction / 30);
					const totalReduction = cyclesPassed * 100;

					// Ensure BMR never goes below 1300
					const newBmr = Math.max(MIN_BMR, user.bmr - totalReduction);

					// If no actual reduction is possible, skip update
					if (newBmr === user.bmr) {
						continue;
					}

					updatePromises.push(
						user.update({
							bmr: newBmr,
							lastBmrReductionDate: today
						})
					);

					bmrUpdatedCount++;

					console.log(`Reduced BMR for ${user.email}: ${user.bmr} → ${newBmr} (${totalReduction} reduction)`);
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
