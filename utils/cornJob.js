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

			// For debugging: Check your specific user
			const testUserActivatedAt = new Date("2026-01-18T13:30:46Z");
			console.log("\n--- DEBUG: Checking your specific user (ID: 430) ---");
			console.log(`User activatedAt: ${testUserActivatedAt.toString()}`);
			console.log(`User activatedAt (ISO): ${testUserActivatedAt.toISOString()}`);
			console.log(`Should user be included? ${testUserActivatedAt <= threeDaysAgo ? "YES" : "NO"}`);
			console.log(
				`Difference in days: ${Math.floor((threeDaysAgo - testUserActivatedAt) / (1000 * 60 * 60 * 24))} days`
			);

			// 1. FIRST CHECK: SPECIFIC USER 430
			console.log("\n--- SPECIFIC CHECK FOR USER 430 ---");
			const specificUser = await User.findOne({
				where: {
					id: 430,
					isActive: "Y",
					isdeleted: "N",
					roleId: 2
				}
			});

			if (specificUser) {
				console.log(`✅ User 430 found in database:`);
				console.log(`   - Email: ${specificUser.email}`);
				console.log(`   - activatedAt: ${specificUser.activatedAt}`);
				console.log(`   - activatedAt type: ${typeof specificUser.activatedAt}`);

				// Check the date comparison manually
				const userDate = new Date(specificUser.activatedAt);
				console.log(`   - activatedAt as Date: ${userDate.toISOString()}`);
				console.log(
					`   - Comparison: ${userDate.toISOString()} <= ${threeDaysAgo.toISOString()} = ${userDate <= threeDaysAgo ? "✅ YES" : "❌ NO"}`
				);

				// Check all conditions
				console.log(`   - isActive = 'Y': ${specificUser.isActive === "Y" ? "✅" : "❌"}`);
				console.log(`   - isdeleted = 'N': ${specificUser.isdeleted === "N" ? "✅" : "❌"}`);
				console.log(`   - roleId = 2: ${specificUser.roleId === 2 ? "✅" : "❌"}`);
			} else {
				console.log("❌ User 430 NOT FOUND or doesn't match basic conditions!");
			}

			// 2. CHECK USER PLANS SUBQUERY
			console.log("\n--- CHECKING USER PLANS ---");

			// Check specific user 430
			const userPlanCheck430 = await db.sequelize.query(
				`SELECT COUNT(*) as planCount FROM userPlans WHERE userId = 430`,
				{ type: db.sequelize.QueryTypes.SELECT }
			);
			console.log(`User 430 has ${userPlanCheck430[0].planCount} user plans`);

			// Check total users with plans
			const allUsersWithPlans = await db.sequelize.query(`SELECT COUNT(DISTINCT userId) as count FROM userPlans`, {
				type: db.sequelize.QueryTypes.SELECT
			});
			console.log(`Total users with plans: ${allUsersWithPlans[0].count}`);

			// 3. STEP-BY-STEP DEBUGGING
			console.log("\n--- STEP-BY-STEP DEBUGGING ---");

			// Step 1: Check just date condition
			const step1 = await User.findAll({
				where: {
					activatedAt: {
						[db.Sequelize.Op.lte]: threeDaysAgo
					},
					roleId: 2
				},
				attributes: ["id", "email", "activatedAt"],
				limit: 10
			});
			console.log(`Step 1 (date + role): ${step1.length} users`);
			console.log(`   Includes user 430? ${step1.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`);

			// Step 2: Add isActive and isdeleted
			const step2 = await User.findAll({
				where: {
					activatedAt: {
						[db.Sequelize.Op.lte]: threeDaysAgo
					},
					roleId: 2,
					isActive: "Y",
					isdeleted: "N"
				},
				attributes: ["id", "email", "activatedAt", "isActive", "isdeleted"],
				limit: 10
			});
			console.log(`Step 2 (+active/not deleted): ${step2.length} users`);
			console.log(`   Includes user 430? ${step2.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`);

			// Step 3: Check all users matching conditions (without plan check)
			const step3 = await User.findAll({
				where: {
					activatedAt: {
						[db.Sequelize.Op.lte]: threeDaysAgo
					},
					roleId: 2,
					isActive: "Y",
					isdeleted: "N"
				},
				attributes: ["id", "email", "activatedAt"]
			});
			console.log(`Step 3 (all matching users without plan check): ${step3.length} users`);
			console.log(`   Includes user 430? ${step3.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`);

			// Check specifically if user 430 is in step3
			if (step3.some((u) => u.id === 430)) {
				const user430 = step3.find((u) => u.id === 430);
				console.log(`   User 430 details from query:`, user430.toJSON());
			}

			// 4. TRY ALTERNATIVE QUERY APPROACH
			console.log("\n--- TESTING ALTERNATIVE QUERY ---");

			// Method A: Raw query approach
			const rawQuery = `
            SELECT u.id, u.email, u.activatedAt, u.isActive, u.isdeleted, u.roleId
            FROM users u
            LEFT JOIN userPlans up ON u.id = up.userId
            WHERE u.activatedAt <= '${threeDaysAgo.toISOString().slice(0, 19).replace("T", " ")}'
              AND u.isActive = 'Y'
              AND u.isdeleted = 'N'
              AND u.roleId = 2
              AND up.userId IS NULL
            LIMIT 20
        `;

			const rawResults = await db.sequelize.query(rawQuery, {
				type: db.sequelize.QueryTypes.SELECT
			});
			console.log(`Raw LEFT JOIN query found: ${rawResults.length} users`);
			console.log(`   Includes user 430? ${rawResults.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`);

			if (rawResults.some((u) => u.id === 430)) {
				console.log("   ✅ User 430 found with LEFT JOIN approach!");
			}

			// Method B: Using NOT EXISTS instead of NOT IN
			const notExistsQuery = `
            SELECT u.id, u.email, u.activatedAt
            FROM users u
            WHERE u.activatedAt <= '${threeDaysAgo.toISOString().slice(0, 19).replace("T", " ")}'
              AND u.isActive = 'Y'
              AND u.isdeleted = 'N'
              AND u.roleId = 2
              AND NOT EXISTS (
                  SELECT 1 FROM userPlans up WHERE up.userId = u.id
              )
            LIMIT 20
        `;

			const notExistsResults = await db.sequelize.query(notExistsQuery, {
				type: db.sequelize.QueryTypes.SELECT
			});
			console.log(`NOT EXISTS query found: ${notExistsResults.length} users`);
			console.log(`   Includes user 430? ${notExistsResults.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`);

			// 5. ORIGINAL QUERY WITH EXTENDED LOGGING
			console.log("\n--- EXECUTING ORIGINAL QUERY WITH DETAILED LOGS ---");
			console.log("Query conditions:");
			console.log("1. activatedAt <= ", threeDaysAgo.toISOString());
			console.log("2. isActive = 'Y'");
			console.log("3. isdeleted = 'N'");
			console.log("4. roleId = 2");
			console.log("5. id NOT IN (SELECT DISTINCT userId FROM userPlans)");

			const expiredTrialUsers = await User.findAll({
				where: {
					activatedAt: {
						[db.Sequelize.Op.lte]: threeDaysAgo
					},
					isActive: "Y",
					isdeleted: "N",
					roleId: 2,
					id: {
						[db.Sequelize.Op.notIn]: db.Sequelize.literal(`(SELECT DISTINCT userId FROM userPlans)`)
					}
				},
				logging: (sql) => {
					console.log("\n--- ORIGINAL QUERY SQL ---");
					console.log(sql);
					console.log("--- END ORIGINAL QUERY ---\n");
				}
			});

			console.log(`\n--- FINAL RESULTS ---`);
			console.log(`Original query found: ${expiredTrialUsers.length} trial users`);

			if (expiredTrialUsers.length > 0) {
				console.log("\nList of users found:");
				expiredTrialUsers.slice(0, 10).forEach((user, index) => {
					console.log(`[${index + 1}] ID: ${user.id}, Email: ${user.email}, Activated: ${user.activatedAt}`);
				});
				if (expiredTrialUsers.length > 10) {
					console.log(`... and ${expiredTrialUsers.length - 10} more`);
				}
			} else {
				console.log("\n❌ NO USERS FOUND with original query!");
				console.log("\nPossible issues identified:");

				// Create summary
				console.log("SUMMARY:");
				console.log(`1. User 430 exists and matches conditions: ${specificUser ? "✅ YES" : "❌ NO"}`);
				console.log(`2. User 430 has no plans: ${userPlanCheck430[0].planCount === 0 ? "✅ YES" : "❌ NO"}`);
				console.log(`3. User 430 passes date check: ${testUserActivatedAt <= threeDaysAgo ? "✅ YES" : "❌ NO"}`);
				console.log(
					`4. Step 3 (without plan check) includes user 430: ${step3.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`
				);
				console.log(
					`5. Raw LEFT JOIN query includes user 430: ${rawResults.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`
				);
				console.log(
					`6. NOT EXISTS query includes user 430: ${notExistsResults.some((u) => u.id === 430) ? "✅ YES" : "❌ NO"}`
				);

				if (rawResults.some((u) => u.id === 430) && !expiredTrialUsers.some((u) => u.id === 430)) {
					console.log("\n🚨 DISCOVERY: Raw query finds user 430 but Sequelize query doesn't!");
					console.log("This suggests a Sequelize issue with the NOT IN subquery.");
				}
			}

			if (!expiredTrialUsers.length) {
				console.log("\n⚠️ No users to deactivate with original query.");

				// If raw query found users, use those instead
				if (rawResults.length > 0) {
					console.log(`\n🔧 Using raw query results instead (found ${rawResults.length} users)...`);

					for (const userData of rawResults) {
						const user = await User.findByPk(userData.id);
						if (user) {
							console.log(`Processing user ${user.id} (${user.email})...`);

							// await user.update({
							//     isActive: "N"
							// });

							try {
								// await Notifications.sendFcmNotification(
								//     user.id,
								//     "Trial Period Ended",
								//     "Your 3-day free trial has ended. Upgrade to continue.",
								//     "trial_expired"
								// );
								console.log(`  ✓ Sent notification to user ${user.id}`);
							} catch (notifError) {
								console.log(`  ✗ Failed to send notification: ${notifError.message}`);
							}

							console.log(`  ✓ Deactivated trial user: ${user.email}`);
						}
					}

					console.log(`\n✅ Successfully processed ${rawResults.length} users using raw query`);
					return;
				}

				console.log("Ending job.");
				return;
			}

			// PROCESS DEACTIVATIONS
			console.log("\n--- PROCESSING DEACTIVATIONS ---");
			for (const user of expiredTrialUsers) {
				console.log(`Processing user ${user.id} (${user.email})...`);

				// await user.update({
				//     isActive: "N"
				// });

				try {
					// await Notifications.sendFcmNotification(
					//     user.id,
					//     "Trial Period Ended",
					//     "Your 3-day free trial has ended. Upgrade to continue.",
					//     "trial_expired"
					// );
					console.log(`  ✓ Sent notification to user ${user.id}`);
				} catch (notifError) {
					console.log(`  ✗ Failed to send notification: ${notifError.message}`);
				}

				console.log(`  ✓ Deactivated trial user: ${user.email}`);
			}

			console.log(`\n========== COMPLETED: Processed ${expiredTrialUsers.length} trial users ==========`);
		} catch (error) {
			console.error("\n❌ ERROR in trial user deactivation cron job:");
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);

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
