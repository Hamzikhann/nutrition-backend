const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const { sequelize } = require("../../models");
const { Op } = require("sequelize");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");
const moment = require("moment-timezone");
const Notifications = require("../../utils/notificationsHelper");
const Redis = require("ioredis");
const redis = new Redis();

const Users = db.users;
const Roles = db.roles;
const UserProfile = db.userProfile;
const Plan = db.plans;
const Payment = db.payments;
const UserPlans = db.userPlans;
const UserAssesmentForm = db.userAssesmentForm;

const UserAssesmentFormFiles = db.userAssesmentFormFiles;

const SupplementsCategories = db.supplementsCategories;
const AssignedSupplements = db.assignedSupplements;
const UserAssesmentProgress = db.userAssesmentProgress;
const Measurements = db.measurements;
const Week = db.weeks;
const WorkOutDayExercises = db.workoutDayExercises;
const WorkoutsCompletions = db.workoutsCompletions;
const Habits = db.habits;
const HabitsCompletions = db.habitsCompletions;

exports.updateStatus = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			id: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const id = crypto.decrypt(req.body.id);

			const user = await Users.update({ isActive: "Y" }, { where: { id } });

			// Send notification to the user after status update
			try {
				await Notifications.sendFcmNotification(
					id,
					"Account Activated",
					"Your account has been activated successfully.",
					"status_update",
					{ status: "active" }
				);
			} catch (notificationError) {
				console.error("Failed to send notification:", notificationError);
				// Do not fail the status update if notification fails
			}

			return res.status(200).send({
				message: "User status updated successfully and notification sent",
				data: user
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while updating the user status."
		});
	}
};

exports.create = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			firstName: Joi.string().required(),
			lastName: Joi.string().required(),
			phoneNo: Joi.string().required(),
			email: Joi.string().email().required(),
			planId: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			if (!req.file) {
				return res.status(201).send({
					message: "File is required"
				});
			}

			const userExists = await Users.findOne({ where: { email: req.body.email?.trim(), isActive: "Y" } });

			if (userExists) {
				res.status(401).send({
					title: "Email already exists!",
					mesage: "Email already registered."
				});
			} else {
				const userObj = {
					firstName: req.body.firstName?.trim(),
					lastName: req.body.lastName?.trim(),
					phoneNo: req.body.phoneNo,
					email: req.body.email,
					isActive: "N",
					roleId: 2
				};
				let transactionUpload = await uploadFileToSpaces(req.file, "Payments");
				const getPlan = await Plan.findOne({ where: { id: crypto.decrypt(req.body.planId), isActive: "Y" } });

				// if (req.role == "Administrator") userObj.roleId = crypto.decrypt(req.body.roleId);
				// else userObj.roleId = "3";

				let transaction = await sequelize.transaction();
				Users.create(userObj, { transaction })

					.then(async (user) => {
						UserProfile.create({ userId: user.id }, { transaction })
							.then(async (profile) => {
								const transactionObj = {
									amount: getPlan.price,
									currency: "Rupees",
									paymentMethod: "Online",
									status: "Paid",
									paymentIntentId: "",
									file: transactionUpload,
									userId: user.id
								};
								let createUserPlans = await UserPlans.create(
									{
										planId: getPlan.id,
										userId: user.id
									},
									{ transaction }
								);

								let createTransection = await Payment.create(transactionObj, { transaction });
								await transaction.commit();
								let updateUser = await Users.update({ isPayment: "Y" }, { where: { id: user.id } });
								encryptHelper(user);

								res.status(200).send({
									message: "User created successfully.",
									data: user
								});
							})
							.catch(async (err) => {
								if (transaction) await transaction.rollback();
								emails.errorEmail(req, err);
								res.status(500).send({
									message: err.message || "Some error occurred while creating the Quiz."
								});
							});
					})
					.catch(async (err) => {
						if (transaction) await transaction.rollback();
						emails.errorEmail(req, err);
						res.status(500).send({
							message: err.message || "Some error occurred while creating the Quiz."
						});
					});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.getUserProgress = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			userId: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const userId = crypto.decrypt(req.body.userId);

		// Get user's plan
		const userPlan = await UserPlans.findOne({
			where: { userId },
			include: [{ model: Plan }]
		});

		if (!userPlan) {
			return res.status(200).send({
				message: "User progress retrieved successfully",
				data: {
					totalWorkouts: 0,
					completedWorkouts: 0,
					habits: []
				}
			});
		}

		// const planId = userPlan.planId;
		const durationWeeks = convertDurationToWeeks(userPlan.duration);
		// Get weeks for the plan
		const weeks = await Week.findAll({
			where: {
				order: { [db.Sequelize.Op.lte]: durationWeeks } // numeric comparison
			}
		});
		const weekIds = weeks.map((w) => w.id);
		// Total workouts: count exercises in those weeks
		const totalWorkouts = await WorkOutDayExercises.count({ where: { weekId: weekIds } });

		// Completed workouts: count completions for the user
		const completedWorkouts = await WorkoutsCompletions.count({ where: { userId } });

		// Get habits
		const userHabits = await Habits.findAll({
			where: { mandatory: true, isActive: "Y" },
			include: [{ model: HabitsCompletions, required: true }]
		});

		const habits = userHabits.map((uh) => ({
			name: uh.habit.name,
			completed: uh.habitsCompletions && uh.habitsCompletions.length > 0
		}));

		return res.status(200).send({
			message: "User progress retrieved successfully",
			data: {
				totalWorkouts,
				completedWorkouts,
				habits
			}
		});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while retrieving user progress."
		});
	}
};

exports.updateProfile = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			firstName: Joi.string().required(),
			lastName: Joi.string().required(),
			email: Joi.string().email().required(),
			age: Joi.number().integer().min(1).max(120).optional().allow(null),
			phoneNo: Joi.string().optional().allow(null).allow(""),
			about: Joi.string().optional().allow(null).allow("")
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);
			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userId = crypto.decrypt(req.userId);

			// Check if user exists
			const existingUser = await Users.findOne({ where: { id: userId, isActive: "Y" } });
			if (!existingUser) {
				return res.status(404).send({
					message: "User not found."
				});
			}

			// Check for email uniqueness (exclude current user)
			const emailExists = await Users.findOne({
				where: {
					email: req.body.email?.trim(),
					isActive: "Y",
					isdeleted: "N",
					id: { [Op.ne]: userId }
				}
			});
			if (emailExists) {
				return res.status(400).send({
					message: "Email already exists."
				});
			}

			let imageUrl = existingUser.imageURL;
			if (req.file) {
				// Upload new image
				imageUrl = await uploadFileToSpaces(req.file, "users");
			}

			const userUpdate = {
				firstName: req.body.firstName?.trim(),
				lastName: req.body.lastName?.trim(),
				email: req.body.email?.trim(),
				age: req.body.age,
				phoneNo: req.body.phoneNo,
				imageURL: imageUrl
			};

			const profileUpdate = {
				about: req.body.about
			};

			const transaction = await sequelize.transaction();

			try {
				await Users.update(userUpdate, { where: { id: userId, isActive: "Y" }, transaction });

				// Update or create userProfile
				const existingProfile = await UserProfile.findOne({ where: { userId, isActive: "Y" } });
				if (existingProfile) {
					await UserProfile.update(profileUpdate, { where: { userId, isActive: "Y" }, transaction });
				} else {
					await UserProfile.create({ ...profileUpdate, userId }, { transaction });
				}

				await transaction.commit();

				// Fetch updated user with profile
				const updatedUser = await Users.findOne({
					where: { id: userId, isActive: "Y" },
					include: [
						{
							model: UserProfile,
							attributes: ["about"]
						}
					],
					attributes: ["id", "firstName", "lastName", "email", "age", "phoneNo", "imageURL"]
				});

				encryptHelper(updatedUser);

				res.status(200).send({
					message: "Profile updated successfully.",
					data: updatedUser
				});
			} catch (err) {
				await transaction.rollback();
				emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while updating profile."
				});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.listUsers = (req, res) => {
	try {
		// const where = { isActive: "Y" };

		Users.findAll({
			where: { isdeleted: "N" },

			include: [
				{
					model: Roles,
					where: { isActive: "Y", id: [1, 2] },
					attributes: ["title"]
				},
				{
					model: UserPlans,
					include: [{ model: Plan }],
					required: false
				},
				{
					model: Payment,
					required: false
				},
				{
					model: UserAssesmentForm,
					where: { isActive: "Y" },
					required: false,
					include: [{ model: UserAssesmentFormFiles }]
				},
				{
					model: AssignedSupplements,
					where: { isActive: "Y" },
					required: false,
					inlude: [
						{
							model: SupplementsCategories,
							required: false
						}
					]
				},
				{
					model: UserAssesmentProgress,
					required: false,
					include: [
						{
							model: Measurements,
							required: false
						}
					]
				}
			],
			attributes: { exclude: ["updatedAt", "password"] }
		})
			.then((data) => {
				encryptHelper(data);
				res.send({
					messgae: "Users list retrived",
					data
				});
			})
			.catch((err) => {
				// emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while retrieving Users."
				});
			});
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.listEmployees = (req, res) => {
	try {
		const where = { isdeleted: "N" };

		Users.findAll({
			where,
			include: [
				{
					model: Roles,
					where: { isActive: "Y", id: 3 },
					attributes: ["title"]
				}
			],
			attributes: {
				exclude: ["createdAt", "updatedAt", "password"]
			}
		})
			.then((data) => {
				encryptHelper(data);
				res.send({
					message: "Employees and their assigned bookings retrieved",
					data
				});
			})
			.catch((err) => {
				// emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Error while retrieving employees."
				});
			});
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Unexpected error."
		});
	}
};

exports.changePassword = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			oldPassword: Joi.string().required(),
			password: Joi.string().min(8).max(16).required(),
			passwordConfirmation: Joi.any()
				.valid(Joi.ref("password"))
				.required()
				.label("Password and confirm password doesn't match.")
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const id = crypto.decrypt(req.userId);
			const oldPassword = req.body.oldPassword;
			const newPassword = req.body.password;

			const user = await Users.findOne({ where: { id: id, isActive: "Y", password: oldPassword } });

			if (user) {
				Users.update({ password: newPassword }, { where: { id: id, isActive: "Y", password: oldPassword } })
					.then((num) => {
						if (num == 1) {
							res.send({
								message: `User password updated successfully!`
							});
						} else {
							res.send({
								message: `Cannot update User password. Maybe User was not found or req body is empty.`
							});
						}
					})
					.catch((err) => {
						emails.errorEmail(req, err);
						res.status(500).send({
							message: "Error updating User password"
						});
					});
			} else {
				res.status(406).send({
					message: `Old password does not match.`
				});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.deactivate = (req, res) => {
	try {
		const userId = crypto.decrypt(req.body.userId);

		Users.update({ isActive: "N" }, { where: { id: userId } })
			.then(async (num) => {
				await redis.del(`session:${userId}`);
				if (num == 1) {
					res.send({
						message: "User was deactivated successfully."
					});
				} else {
					res.send({
						message: `Cannot deactivate User. Maybe User was not found!`
					});
				}
			})
			.catch((err) => {
				emails.errorEmail(req, err);
				res.status(500).send({
					message: "Error deleting User"
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.delete = (req, res) => {
	try {
		const userId = crypto.decrypt(req.body.userId);

		Users.update({ isdeleted: "Y" }, { where: { id: userId } })
			.then(async (num) => {
				await redis.del(`session:${userId}`);
				if (num == 1) {
					res.send({
						message: "User was deleted successfully."
					});
				} else {
					res.send({
						message: `Cannot deleted  User. Maybe User was not found!`
					});
				}
			})
			.catch((err) => {
				emails.errorEmail(req, err);
				res.status(500).send({
					message: "Error deleting User"
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.reset = (req, res) => {
	try {
		const joiSchema = Joi.object({
			userId: Joi.string().required(),
			newPassword: Joi.string().min(8).max(16).required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			emails.errorEmail(req, error);
			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userId = crypto.decrypt(req.body.userId);
			const newPassword = req.body.newPassword;
			Users.findOne({ where: { id: userId, isActive: "Y" } })
				.then((response) => {
					if (response) {
						Users.update({ password: newPassword }, { where: { id: userId, isActive: "Y" } })
							.then((response) => {
								res.send({ message: "Credentiales are updated" });
							})
							.catch((err) => {
								emails.errorEmail(req, err);
								res.status(500).send({
									message: err.message || "Some error occurred."
								});
							});
					}
				})
				.catch((err) => {
					emails.errorEmail(req, err);
					res.status(500).send({
						message: err.message || "Some error occurred."
					});
				});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.createEmployee = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			name: Joi.string().required(),
			phone: Joi.string().required(),
			role: Joi.string().required(),
			email: Joi.string().email().required(),
			modules: Joi.array().required(),
			password: Joi.string().min(8).max(16).required(),
			confirmPassword: Joi.string().min(8).max(16).required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userExists = await Users.findOne({ where: { email: req.body.email?.trim(), isActive: "Y" } });

			if (userExists) {
				res.status(401).send({
					title: "Email already exists!",
					mesage: "Email already registered."
				});
			} else {
				if (req.body.password === req.body.confirmPassword) {
					const parts = req.body.name.trim().split(" ");
					const firstName = parts[0];
					const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

					const userObj = {
						firstName: firstName?.trim(),
						lastName: lastName?.trim(),
						phoneNo: req.body.phone,
						email: req.body.email,
						roleId: crypto.decrypt(req.body.role),
						modules: JSON.stringify(req.body.modules),
						password: req.body.password
					};

					let transaction = await sequelize.transaction();
					Users.create(userObj, { transaction })
						.then(async (user) => {
							UserProfile.create({ userId: user.id }, { transaction })
								.then(async (profile) => {
									encryptHelper(user);

									await transaction.commit();
									return res.status(200).send({
										message: "User created successfully.",
										data: user
									});
								})
								.catch(async (err) => {
									if (transaction) await transaction.rollback();
									emails.errorEmail(req, err);
									res.status(500).send({
										message: err.message || "Some error occurred while creating the Quiz."
									});
								});
						})
						.catch(async (err) => {
							if (transaction) await transaction.rollback();
							emails.errorEmail(req, err);
							res.status(500).send({
								message: err.message || "Some error occurred while creating the Quiz."
							});
						});
				} else {
					res.status(401).send({
						title: "Password doesn't match!",
						mesage: "Password doesn't match."
					});
				}
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

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

// 📊 MAIN API: Weekly / Monthly Habit Progress
exports.getHabitProgress = async (req, res) => {
	try {
		const { timeZone = "UTC" } = req.body;
		const userId = crypto.decrypt(req.userId);

		// Get user to fetch createdAt date
		const user = await Users.findByPk(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// FIX: Use the same timezone conversion for both dates
		const startDate = moment.tz(user.createdAt, timeZone);
		const endDate = moment.tz(new Date(), timeZone);

		console.log(
			`📆 Range in ${timeZone}: ${startDate.format("YYYY-MM-DD HH:mm:ss")} → ${endDate.format("YYYY-MM-DD HH:mm:ss")}`
		);
		console.log(`👤 User ID: ${userId}`);

		// Fetch all active habits with mandatory and percentage
		const habits = await Habits.findAll({
			where: {
				mandatory: "true",
				userId: 1,
				isActive: "Y"
			},
			attributes: ["id", "name", "percentage"]
		});

		console.log(`📋 Found ${habits.length} habits`);

		// FIX: Use the SAME timezone logic for database query
		// Convert the timezone dates to UTC for database query
		const startDateUTC = startDate.clone().utc();
		const endDateUTC = endDate.clone().utc();

		console.log(
			`📆 UTC Range for DB: ${startDateUTC.format("YYYY-MM-DD HH:mm:ss")} → ${endDateUTC.format("YYYY-MM-DD HH:mm:ss")}`
		);

		// FIX: Or better yet, use the original dates without timezone conversion
		const startDateDB = moment(user.createdAt);
		const endDateDB = moment();

		console.log(
			`📆 DB Range (no tz): ${startDateDB.format("YYYY-MM-DD HH:mm:ss")} → ${endDateDB.format("YYYY-MM-DD HH:mm:ss")}`
		);
		console.log(
			`📆 DB Range UTC: ${startDateDB.utc().format("YYYY-MM-DD HH:mm:ss")} → ${endDateDB
				.utc()
				.format("YYYY-MM-DD HH:mm:ss")}`
		);

		// Try query with the original dates (no timezone conversion)
		const completions = await HabitsCompletions.findAll({
			where: {
				isActive: "Y",
				userId: userId,
				createdAt: {
					[Op.between]: [startDateDB.toDate(), endDateDB.toDate()]
				}
			},
			attributes: ["id", "habitId", "createdAt"],
			raw: true
		});

		console.log(`✅ Found ${completions.length} completions in date range`);

		// If still no completions, use the filtered completions from our debug check
		let finalCompletions = completions;
		if (completions.length === 0) {
			console.log("🔄 Using manual date filtering...");
			// Get all completions and filter manually
			const allCompletions = await HabitsCompletions.findAll({
				where: {
					isActive: "Y",
					userId: userId
				},
				attributes: ["id", "habitId", "createdAt"],
				raw: true
			});

			// Manual filtering with timezone
			finalCompletions = allCompletions.filter((comp) => {
				const compDate = moment.tz(comp.createdAt, timeZone);
				return compDate.isBetween(startDate, endDate, null, "[]");
			});
			console.log(`🔄 Manually filtered completions: ${finalCompletions.length}`);
		}

		// Prepare response data
		let graphData = [];

		// Loop through each day from user creation to now
		for (let m = startDate.clone(); m.isSameOrBefore(endDate, "day"); m.add(1, "day")) {
			const day = m.format("YYYY-MM-DD");
			let totalPercentage = 0;
			let completedHabits = [];

			for (let habit of habits) {
				const completed = finalCompletions.find(
					(c) => c.habitId === habit.id && moment.tz(c.createdAt, timeZone).format("YYYY-MM-DD") === day
				);

				if (completed) {
					const percentage = parseFloat(habit.percentage || 0);
					totalPercentage += percentage;
					completedHabits.push({
						habitId: habit.id,
						name: habit.name,
						percentage: percentage
					});
					console.log(`✓ Habit ${habit.id} (${habit.name}) completed on ${day}`);
				}
			}

			graphData.push({
				date: day,
				totalPercentage
			});
		}

		return res.status(200).json({
			message: "Habit progress data retrieved successfully",
			range: {
				startDate: startDate.format("YYYY-MM-DD"),
				endDate: endDate.format("YYYY-MM-DD")
			},
			graphData,
			debug: {
				habitsCount: habits.length,
				completionsCount: finalCompletions.length,
				timeZone: timeZone
			}
		});
	} catch (err) {
		console.error("Error in getHabitProgress:", err);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.updateEmployee = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			id: Joi.string().required(), // encrypted ID
			name: Joi.string().required(),
			phone: Joi.string().required(),
			role: Joi.string().required(),
			email: Joi.string().email().required(),
			modules: Joi.array().required()
		});

		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			const message = error.details[0].message.replace(/"/g, "");
			return res.status(400).send({ message });
		}

		const userId = crypto.decrypt(req.body.id);
		let user = await Users.findOne({ where: { id: userId, isActive: "Y" } });
		if (!user) {
			return res.status(404).send({ message: "User not found or inactive." });
		}

		// Check for duplicate email (exclude same user)
		const existingUser = await Users.findOne({
			where: {
				email: req.body.email.trim(),
				isActive: "Y",
				id: { [Op.ne]: userId }
			}
		});
		if (existingUser) {
			return res.status(400).send({
				title: "Email already exists!",
				message: "Another user with this email already exists."
			});
		}

		// Password validation (only if provided)

		const parts = req.body.name.trim().split(" ");
		const firstName = parts[0];
		const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

		const updatedUserObj = {
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			phoneNo: req.body.phone,
			email: req.body.email,
			roleId: crypto.decrypt(req.body.role),
			modules: JSON.stringify(req.body.modules)
		};

		let transaction = await sequelize.transaction();
		try {
			await Users.update(updatedUserObj, { where: { id: userId }, transaction });

			const updatedUser = await Users.findOne({
				where: { id: userId },
				include: [{ model: UserProfile }]
			});

			encryptHelper(updatedUser);
			await transaction.commit();

			return res.status(200).send({
				message: "User updated successfully.",
				data: updatedUser
			});
		} catch (err) {
			if (transaction) await transaction.rollback();
			emails.errorEmail(req, err);
			return res.status(500).send({
				message: err.message || "Some error occurred while updating the user."
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.updateBmr = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			userId: Joi.string().required(),
			bmr: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const userId = crypto.decrypt(req.body.userId);
			const bmr = req.body.bmr;

			const user = await Users.update({ bmr }, { where: { id: userId } });

			if (user[0] === 1) {
				return res.status(200).send({
					message: "BMR updated successfully",
					data: user
				});
			} else {
				return res.status(404).send({
					message: "User not found or BMR not updated"
				});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while updating BMR."
		});
	}
};

exports.details = async (req, res) => {
	try {
		const schema = Joi.object({ id: Joi.string().required() });
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}
		const id = crypto.decrypt(req.body.id);
		const user = await Users.findOne({ where: { id }, include: [{ model: UserProfile }] });
		if (!user) {
			return res.status(404).send({ message: "User not found" });
		}
		encryptHelper(user);
		return res.status(200).send({ message: "User details retrieved successfully", data: user });
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({ message: err.message || "Some error occurred" });
	}
};
