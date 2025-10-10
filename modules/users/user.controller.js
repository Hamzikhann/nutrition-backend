const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const { sequelize } = require("../../models");
const { Op } = require("sequelize");
// import { uploadFileToS3 } from "../../utils/awsServises";
const { uploadFileToS3 } = require("../../utils/awsServises");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");
const moment = require("moment-timezone");

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
const Week = db.weeks;
const WorkOutDayExercises = db.workoutDayExercises;
const WorkoutsCompletions = db.workoutsCompletions;
const UserHabits = db.userHabits;
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

			return res.status(200).send({
				message: "User status updated successfully",
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
		console.log(durationWeeks);
		// Get weeks for the plan
		const weeks = await Week.findAll({
			where: {
				order: { [db.Sequelize.Op.lte]: durationWeeks } // numeric comparison
			}
		});
		console.log(weeks.length);
		const weekIds = weeks.map((w) => w.id);
		console.log(weekIds);
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

// exports.update = async (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			userId: Joi.string().required(),
// 			title: Joi.string().required(),
// 			firstName: Joi.string().required(),
// 			lastName: Joi.string().required(),
// 			phoneNo: Joi.string().required(),
// 			email: Joi.string().optional().allow("").allow(null)
// 		});
// 		const { error, value } = joiSchema.validate(req.body);

// 		if (error) {
// 			emails.errorEmail(req, error);

// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			const userId = crypto.decrypt(req.body.userId);
// 			let userExists;

// 			if (req.role == "Administrator") {
// 				userExists = await Users.findOne({ where: { id: userId, isActive: "Y" } });
// 			} else if (req.role == "User" || req.role == "Employee") {
// 				userExists = await Users.findOne({ where: { id: userId, email: req.body.email?.trim(), isActive: "Y" } });
// 			}

// 			if (!userExists) {
// 				res.status(401).send({
// 					title: "User not Found!",
// 					mesage: "User not Found."
// 				});
// 				return;
// 			}
// 			const user = {
// 				title: req.body.title,
// 				firstName: req.body.firstName?.trim(),
// 				lastName: req.body.lastName?.trim(),
// 				phoneNo: req.body.phoneNo
// 				// email: req.body.email
// 			};

// 			var updateUser = await Users.update(user, { where: { id: userId, isActive: "Y" } });
// 			const getUpdatedUser = await Users.findOne({
// 				where: {
// 					id: userId,
// 					isActive: "Y"
// 				},
// 				include: [
// 					{
// 						model: UserProfile,
// 						attributes: ["id", "imageUrl"]
// 					},
// 					{
// 						model: Roles,
// 						attributes: ["title"]
// 					}
// 				],
// 				attributes: ["id", "title", "firstName", "lastName", "email", "roleId", "phoneNo"]
// 			});
// 			encryptHelper(getUpdatedUser);
// 			if (updateUser == 1) {
// 				res.send({
// 					message: "User updated successfully.",
// 					data: getUpdatedUser
// 				});
// 			} else {
// 				res.status(500).send({
// 					message: "Failed to update user."
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.updateProfile = async (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			firstName: Joi.string().required(),
// 			lastName: Joi.string().required(),
// 			email: Joi.string().required(),
// 			jobTitle: Joi.string().optional().allow(null).allow(""),
// 			phoneNumber: Joi.string().optional().allow(null).allow(""),
// 			skype: Joi.string().optional().allow(null).allow(""),
// 			address: Joi.string().optional().allow(null).allow(""),
// 			city: Joi.string().optional().allow(null).allow(""),
// 			state: Joi.string().optional().allow(null).allow(""),
// 			zipcode: Joi.string().optional().allow(null).allow(""),
// 			country: Joi.string().optional().allow(null).allow("")
// 		});
// 		const { error, value } = joiSchema.validate(req.body);

// 		if (error) {
// 			emails.errorEmail(req, error);

// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			const userId = crypto.decrypt(req.userId);
// 			const profileId = crypto.decrypt(req.profileId);

// 			var user = {
// 				firstName: req.body.firstName?.trim(),
// 				lastName: req.body.lastName?.trim(),
// 				email: req.body.email?.trim()
// 			};
// 			var profile = {
// 				jobTitle: req.body.jobTitle,
// 				phoneNumber: req.body.phoneNumber,
// 				skype: req.body.skype,
// 				address: req.body.address,
// 				city: req.body.city,
// 				state: req.body.state,
// 				zipcode: req.body.zipcode,
// 				country: req.body.country
// 			};

// 			var transaction = await sequelize.transaction();

// 			var updateUser = await Users.update(user, { where: { id: userId, isActive: "Y" }, transaction });
// 			var updateProfile = await UserProfile.update(profile, { where: { id: profileId, isActive: "Y" }, transaction });

// 			if (updateUser == 1 && updateProfile == 1) {
// 				if (transaction) await transaction.commit();
// 				res.send({
// 					message: "User profile updated successfully."
// 				});
// 			} else {
// 				if (transaction) await transaction.rollback();
// 				res.send({
// 					message: "Failed to update user profile."
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.updateProfileImage = async (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			image: Joi.any(),
// 			userId: Joi.string().optional().allow("").allow(null)
// 		});
// 		const { error, value } = joiSchema.validate(req.body);

// 		if (error) {
// 			emails.errorEmail(req, error);

// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			let userId;

// 			if (req.role == "Administrator") {
// 				userId = req.body?.userId ? crypto.decrypt(req.body?.userId) : "";
// 			} else {
// 				userId = crypto.decrypt(req.userId);
// 			}
// 			let imageUrl = "uploads/users/" + req.file.filename;
// 			var updateUser = await Users.update({ imageURL: imageUrl }, { where: { id: userId, isActive: "Y" } });

// 			if (updateUser == 1) {
// 				res.status(200).send({ message: "User Profile Image is Updated" });
// 			} else {
// 				res.send({
// 					message: "Failed to update user profile image."
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

exports.listUsers = (req, res) => {
	try {
		// const where = { isActive: "Y" };

		Users.findAll({
			// where,

			include: [
				// {
				// 	model: UserProfile,
				// 	attributes: { exclude: ["isActive", "createdAt", "updatedAt"] }
				// },
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
				emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while retrieving Users."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.listEmployees = (req, res) => {
	try {
		const where = { isActive: "Y" };

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
				emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Error while retrieving employees."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Unexpected error."
		});
	}
};

exports.detail = async (req, res) => {
	try {
		const userId = crypto.decrypt(req.body.userId);

		// First get the basic user info
		const user = await Users.findOne({
			where: { id: userId, isActive: "Y" },
			include: [
				{
					model: Roles,
					attributes: ["title"]
				}
			],
			attributes: {
				exclude: ["isActive", "password", "updatedAt", "roleId"]
			}
		});

		if (!user) {
			return res.status(404).send({
				message: "User not found"
			});
		}

		const userPlain = user.get({ plain: true });

		let result = {
			...userPlain,
			role: userPlain.role?.title
		};

		// For employees, get their assignment stats
		if (userPlain.role?.title.toLowerCase() === "employee") {
			const assignmentStatsQuery = `
  SELECT
    COUNT(ba.id) AS totalAssignments,
    SUM(CASE WHEN b.status = 'Completed' THEN 1 ELSE 0 END) AS completedAssignments,
    SUM(CASE WHEN b.status = 'Started' THEN 1 ELSE 0 END) AS activeAssignments,
    SUM(CASE WHEN b.status = 'Inprogress' THEN 1 ELSE 0 END) AS inprogressAssignments
  FROM bookingAssignments ba
  INNER JOIN bookings b ON b.id = ba.bookingId
  WHERE ba.employeeId = :userId AND ba.isActive = 'Y'
`;

			const [assignmentStats] = await sequelize.query(assignmentStatsQuery, {
				replacements: { userId },
				type: sequelize.QueryTypes.SELECT
			});

			result = {
				...result,
				totalAssignments: Number(assignmentStats.totalAssignments || 0),
				completedAssignments: Number(assignmentStats.completedAssignments || 0),
				activeAssignments: Number(assignmentStats.activeAssignments || 0),
				inprogressAssignments: Number(assignmentStats.inprogressAssignments || 0),
				performanceRating: "N/A"
			};
		}
		// For regular users, get their booking stats
		else {
			const bookingStats = await Bookings.findAll({
				where: {
					userId: userId,
					isActive: "Y"
				},
				attributes: [
					[sequelize.fn("COUNT", sequelize.col("id")), "totalBookings"],
					[
						sequelize.fn("COUNT", sequelize.literal(`CASE WHEN status = 'Inprogress' THEN 1 ELSE 0 END`)),
						"upcomingBookings"
					],
					[
						sequelize.fn("COUNT", sequelize.literal(`CASE WHEN status = 'Completed' THEN 1 ELSE 0 END`)),
						"completedBookings"
					],
					[sequelize.fn("COUNT", sequelize.literal(`CASE WHEN status = 'Started' THEN 1 ELSE 0 END`)), "activeBookings"]
				],
				raw: true
			});

			result = {
				...result,
				totalBookings: bookingStats[0]?.totalBookings || 0,
				upcomingBookings: bookingStats[0]?.upcomingBookings || 0,
				completedBookings: bookingStats[0]?.completedBookings || 0,
				cancelledBookings: bookingStats[0]?.cancelledBookings || 0,
				activeBookings: bookingStats[0]?.activeBookings || 0
			};
		}
		result;
		// encryptHelper(result);
		res.send({
			message: "User info retrieved successfully",
			data: result
		});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while retrieving user details."
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

exports.delete = (req, res) => {
	try {
		const userId = crypto.decrypt(req.body.userId);

		Users.update({ isActive: "N" }, { where: { id: userId } })
			.then(async (num) => {
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

// 🧠 Helper: get correct week (Mon → Sun) range
function getWeekRange(date, timeZone) {
	const mDate = moment.tz(date, timeZone);

	// Move to Monday start (moment uses Sunday as 0)
	const dayOfWeek = mDate.day(); // 0 = Sunday, 1 = Monday, etc.
	const startOfWeek = mDate.clone().subtract(dayOfWeek === 0 ? 6 : dayOfWeek - 1, "days");
	const endOfWeek = startOfWeek.clone().add(6, "days");

	return {
		startOfWeek: startOfWeek.startOf("day").format("YYYY-MM-DD HH:mm:ss"),
		endOfWeek: endOfWeek.endOf("day").format("YYYY-MM-DD HH:mm:ss")
	};
}

// 🧠 Helper: get current month range
function getMonthRange(date, timeZone) {
	const mDate = moment.tz(date, timeZone);
	return {
		startOfMonth: mDate.clone().startOf("month").format("YYYY-MM-DD HH:mm:ss"),
		endOfMonth: mDate.clone().endOf("month").format("YYYY-MM-DD HH:mm:ss")
	};
}

// 📊 MAIN API: Weekly / Monthly Habit Progress
exports.getHabitProgress = async (req, res) => {
	try {
		const { type, date, timeZone = "UTC" } = req.body;
		if (!["week", "month"].includes(type)) {
			return res.status(400).json({ message: "Invalid type. Must be 'week' or 'month'." });
		}
		if (!date) {
			return res.status(400).json({ message: "Date is required." });
		}

		// Get the correct range based on type
		let range;
		if (type === "week") {
			range = getWeekRange(date, timeZone);
		} else {
			range = getMonthRange(date, timeZone);
		}

		console.log(`📆 Type: ${type}`);
		console.log(`🕒 Range: ${range.startOfWeek || range.startOfMonth} → ${range.endOfWeek || range.endOfMonth}`);

		const startDate = range.startOfWeek || range.startOfMonth;
		const endDate = range.endOfWeek || range.endOfMonth;

		// Fetch all active habits with mandatory and percentage
		const habits = await Habits.findAll({
			where: {
				mandatory: "true",
				isActive: "Y"
			},
			attributes: ["id", "name", "percentage"]
		});
console.log(habits)
		// Fetch all completions in date range
		const completions = await HabitsCompletions.findAll({
			where: {
				isActive: "Y",
				userId: crypto.decrypt(req.userId),
				createdAt: {
					[Op.between]: [startDate, endDate]
				}
			},
			attributes: ["habitId", "createdAt"]
		});
console.log(completions)
		// Prepare response data
		let graphData = [];

		// Generate x-axis days (7 for week, up to 30/31 for month)
		const startMoment = moment.tz(startDate, timeZone);
		const endMoment = moment.tz(endDate, timeZone);

		for (let m = startMoment.clone(); m.isSameOrBefore(endMoment, "day"); m.add(1, "day")) {
			const day = m.format("YYYY-MM-DD");
			let totalPercentage = 0;

			for (let habit of habits) {
				const completed = completions.find(
					(c) => c.habitId === habit.id && moment.tz(c.createdAt, timeZone).format("YYYY-MM-DD") === day
				);

				// Add habit percentage if completed that day
				if (completed) totalPercentage += parseFloat(habit.percentage || 0);
			}

			graphData.push({
				date: day,
				totalPercentage
			});
		}

		return res.status(200).json({
			message: `${type}ly habit progress`,
			range: { startDate, endDate },
			graphData
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
