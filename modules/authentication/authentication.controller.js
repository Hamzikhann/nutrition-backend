const db = require("../../models");
const jwt = require("../../utils/jwt");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const emails = require("../../utils/emails");
// const sms = require("../../utils/sms");
const Joi = require("@hapi/joi");
const { sequelize } = require("../../models");
// const moment = require("moment");
require("dotenv").config();
// const twilio = require("twilio");

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const Users = db.users;
const UserProfile = db.userProfile;
const Roles = db.roles;
const Otp = db.otp;

exports.login = async (req, res) => {
	try {
		const userExist = await Users.findOne({
			where: {
				id: crypto.decrypt(req.body.userId),
				isActive: "Y"
			},
			raw: true
		});
		if (userExist) {
			const user = await Users.findOne({
				where: {
					id: crypto.decrypt(req.body.userId),
					// password: req.body.password,
					isActive: "Y"
				},
				include: [
					{
						model: Roles,
						attributes: ["title"]
					}
				],
				attributes: ["id", "firstName", "lastName", "email", "roleId", "phoneNo", "imageURL", "isPaid", "isFormCreated"]
			});
			if (user) {
				// if (req.body.fcmToken) {
				// 	let updateUser = Users.update({ fcmToken: req.body.fcmToken }, { where: { id: user.id } });
				// }
				encryptHelper(user);

				const token = jwt.signToken({
					userId: user.id,
					email: user?.email,
					roleId: user?.roleId,
					role: user?.role?.title
				});
				res.status(200).send({
					message: "Logged in successful",
					data: { user },
					token,
					fcmToken: req.body?.fcmToken ? req.body?.fcmToken : ""
				});
			} else {
				res.status(403).send({
					title: "Incorrect Logins",
					message: "Incorrect Logins"
				});
			}
		} else {
			res.status(401).send({
				title: "Incorrect Email.",
				message: "Email does not exist in our system, Please verify you have entered correct email."
			});
		}
	} catch (err) {
		// emails.errorEmail(req, err);
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.signup = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			title: Joi.string().required(),
			firstName: Joi.string().required(),
			lastName: Joi.string().required(),
			phoneNo: Joi.string().required(),
			email: Joi.string().email().required(),
			password: Joi.string().min(8).max(16).required(),
			fcmToken: Joi.string().optional().allow("").allow(null),
			confirmPassword: Joi.string()
				.valid(Joi.ref("password"))
				.required()
				.label("Confirm password")
				.messages({ "any.only": "{{#label}} does not match password" }),
			roleId: Joi.string().optional().allow("").allow(null)
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
				let roleId = req.body?.roleId ? crypto.decrypt(req.body?.roleId) : "";
				const userObj = {
					title: req.body.title,
					firstName: req.body.firstName?.trim(),
					lastName: req.body.lastName?.trim(),
					phoneNo: req.body.phoneNo,
					email: req.body.email,
					password: req.body.password,
					fcmToken: req.body.fcmToken ? req.body.fcmToken : ""
				};
				if (roleId) userObj.roleId = roleId;
				else userObj.roleId = "3";

				let transaction = await sequelize.transaction();

				Users.create(userObj, { transaction })
					.then(async (response) => {
						UserProfile.create({ userId: response.id }, { transaction })
							.then(async (profile) => {
								await transaction.commit();

								let user = await Users.findOne({
									where: {
										email: req.body.email.trim(),
										password: req.body.password,
										isActive: "Y"
									},
									include: [
										{
											model: UserProfile,
											attributes: ["id", "imageUrl"]
										},
										{
											model: Roles,
											attributes: ["title"]
										}
									],
									attributes: ["id", "title", "firstName", "lastName", "email", "roleId", "phoneNo"]
								});

								encryptHelper(user);
								const token = jwt.signToken({
									userId: user.id,
									profileId: user.userProfile.id,
									roleId: user.roleId,
									role: user.role.title
								});

								res.status(200).send({
									message: "Signup in successful",
									data: { user },
									token
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

function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.forgotPassword = async (req, res) => {
	try {
		var email = req.body.email.trim();
		const user = await Users.findOne({
			where: {
				email: email,
				isActive: "Y"
			}
		});
		if (user) {
			const otp = generateOTP();

			emails.forgotPassword(user, otp);

			const forgetPasswordToken = jwt.signToken({
				userId: user.id,
				roleId: user.roleId,
				email: user.email
			});

			res.status(200).send({ message: "Email send to user.", data: { token: forgetPasswordToken, otp: otp } });
		} else {
			res.status(401).send({
				title: "Incorrect Email.",
				message: "Email does not exist in our system, Please verify you have entered correct email."
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.resetPassword = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			password: Joi.string().min(8).max(16).required(),
			confirmPassword: Joi.any().valid(Joi.ref("password")).required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			var email = req.email;
			const user = await Users.findOne({
				where: {
					email: email,
					isActive: "Y"
				}
			});

			if (user) {
				var password = req.body.password;

				Users.update({ password: password }, { where: { id: user.id } })
					.then((result) => {
						res.send({
							message: "User password reset successfully."
						});
					})
					.catch((err) => {
						emails.errorEmail(req, err);
						res.status(500).send({
							message: "Error while reset User password"
						});
					});
			} else {
				res.status(401).send({
					title: "Incorrect Email.",
					message: "Email does not exist in our system, Please verify you have entered correct email."
				});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.sendOtp = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			email: Joi.string().required().allow("").allow(null),
			phoneNo: Joi.string().required().allow("").allow(null)
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			var email = req.body?.email;
			var phoneNo = req.body?.phoneNo;
			// const otp = generateOTP();
			const otp = "0000";

			let createOtp = await Otp.create({
				otp: otp
			});

			// if (email) emails.sendVerificationEmail(email, otp);
			// else if (phoneNo) sms.sendOtpSms(otp, phoneNo);

			res.status(200).send({ message: "Verification code send to user.", data: { otp: otp } });
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.checkEmail = async (req, res) => {
	try {
		let email = req.body.email;

		Users.findOne({ where: { email: email, isActive: "Y" } })
			.then((response) => {
				if (response) {
					res.send({ message: "Email Already Exists.", data: 1 });
				} else {
					res.send({ message: "Email Not Exists.", data: 0 });
				}
			})
			.catch((err) => {
				emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while reset password."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred while reset password."
		});
	}
};

exports.verifyOtp = async (req, res) => {
	try {
		// Input validation
		const joiSchema = Joi.object({
			email: Joi.string().allow("").allow(null),
			phoneNo: Joi.string().allow("").allow(null),
			otp: Joi.string().required()
		});

		const { error } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message.replace(/"/g, "")
			});
		}

		const { email, phoneNo, otp } = req.body;

		// Verify OTP exists
		const otpCheck = await Otp.findOne({ where: { otp } });
		if (!otpCheck) {
			return res.status(401).send({
				title: "Incorrect Otp",
				message: "OTP does not exist in our system"
			});
		}

		// Check if user exists (with proper include syntax)
		const user = await Users.findOne({
			where: { email, phoneNo },
			include: [
				{
					model: Roles, // Make sure this matches your model name exactly
					required: false
				}
			]
		});

		// Handle different user states
		if (user) {
			if (user.isActive == "N") {
				encryptHelper(user);

				return res.status(401).send({
					title: "User Not Active",
					message: "User not active, please contact admin",
					data: user
				});
			}
		} else if (user.isActive == "Y") {
			encryptHelper(user);

			return res.status(401).send({
				title: "User Active",
				message: "User active, otp verified",
				data: user
			});
		} else {
			// Create new user if doesn't exist
			let createdUser = await Users.create({
				email,
				phoneNo,
				isActive: "N",
				roleId: 2 // Default role for new users
			});

			let getUser = await Users.findOne({
				where: {
					id: createdUser.id
				},
				include: [
					{
						model: Roles
					}
				]
			});

			encryptHelper(getUser);
			return res.status(200).send({
				message: "OTP verified successfully. Account pending activation.",
				data: createdUser
			});
		}
	} catch (err) {
		console.error("Error in verifyOtp:", err);
		return res.status(500).send({
			message: "Internal server error during OTP verification"
		});
	}
};

exports.loginv2 = async (req, res) => {
	try {
		const userExist = await Users.findOne({
			where: {
				email: req.body.email.trim(),
				isActive: "Y"
			},
			attributes: ["password"],
			raw: true
		});
		if (userExist) {
			const user = await Users.findOne({
				where: {
					email: req.body.email.trim(),
					password: req.body.password,
					isActive: "Y"
				},
				include: [
					{
						model: Roles,
						attributes: ["title"]
					}
				],
				attributes: ["id", "firstName", "lastName", "email", "roleId", "phoneNo", "imageURL"]
			});
			if (user && userExist.password === req.body.password) {
				if (req.body.fcmToken) {
					let updateUser = Users.update({ fcmToken: req.body.fcmToken }, { where: { id: user.id } });
				}
				encryptHelper(user);

				const token = jwt.signToken({
					userId: user.id,
					email: user?.email,
					roleId: user.roleId,
					role: user.role.title
				});
				res.status(200).send({
					message: "Logged in successful",
					data: { user },
					token,
					fcmToken: req.body?.fcmToken ? req.body?.fcmToken : ""
				});
			} else {
				res.status(403).send({
					title: "Incorrect Logins",
					message: "Incorrect Logins"
				});
			}
		} else {
			res.status(401).send({
				title: "Incorrect Email.",
				message: "Email does not exist in our system, Please verify you have entered correct email."
			});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
