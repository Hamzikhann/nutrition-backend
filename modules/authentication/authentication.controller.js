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

const { Op } = require("sequelize");
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const Redis = require("ioredis");
const redis = new Redis();

const Users = db.users;
const UserProfile = db.userProfile;
const Roles = db.roles;
const Otp = db.otp;
const UserPlans = db.userPlans;
const Plans = db.plans;

exports.login = async (req, res) => {
	try {
		const decryptedUserId = crypto.decrypt(req.body.userId);

		const userExist = await Users.findOne({
			where: {
				id: decryptedUserId,
				isActive: "Y"
			},
			raw: true
		});

		if (!userExist) {
			return res.status(401).send({
				title: "Incorrect User.",
				message: "User does not exist in our system."
			});
		}

		const user = await Users.findOne({
			where: {
				id: decryptedUserId,
				isActive: "Y"
			},
			include: [
				{
					model: Roles,
					attributes: ["title"]
				},
				{
					model: UserPlans,
					include: [
						{
							model: Plans
						}
					]
				}
			],
			attributes: [
				"id",
				"firstName",
				"lastName",
				"email",
				"roleId",
				"phoneNo",
				"imageURL",
				"modules",
				"isPayment",
				"isFormCreated"
			]
		});

		if (!user) {
			return res.status(403).send({
				title: "Login Failed",
				message: "Invalid credentials."
			});
		}

		// Encrypt user object (your existing helper)
		encryptHelper(user);

		// Generate JWT
		const token = jwt.signToken({
			userId: user.id,
			email: user.email,
			roleId: user.roleId,
			role: user.role?.title
		});

		// Save token in Redis, replacing old session
		await redis.set(`session:${user.id}`, token);

		res.status(200).send({
			message: "Logged in successful",
			data: { user },
			token,
			fcmToken: req.body?.fcmToken ? req.body?.fcmToken : ""
		});
	} catch (err) {
		console.error("Login Error:", err);
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

const { Op } = require("sequelize");

exports.verifyOtp = async (req, res) => {
	try {
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

		const otpCheck = await Otp.findOne({ where: { otp } });
		if (!otpCheck) {
			return res.status(401).send({
				title: "Incorrect OTP",
				message: "OTP does not exist in our system"
			});
		}

		const userByEmail = email ? await Users.findOne({ where: { email }, include: [{ model: Roles }] }) : null;
		const userByPhone = phoneNo ? await Users.findOne({ where: { phoneNo }, include: [{ model: Roles }] }) : null;

		// 🧩 Case 1: both exist but different users → mismatch
		if (userByEmail && userByPhone && userByEmail.id !== userByPhone.id) {
			return res.status(400).send({
				title: "User Mismatch",
				message: "Email and phone number belong to different accounts. Please verify your details."
			});
		}

		// 🧩 Case 2: only one found — check mismatch logic
		if (userByEmail && !userByPhone && phoneNo && userByEmail.phoneNo !== phoneNo) {
			return res.status(400).send({
				title: "Phone Mismatch",
				message: "The phone number you entered does not match our records for this email."
			});
		}

		if (userByPhone && !userByEmail && email && userByPhone.email !== email) {
			return res.status(400).send({
				title: "Email Mismatch",
				message: "The email you entered does not match our records for this phone number."
			});
		}

		// 🧩 Case 3: no user found — create one
		if (!userByEmail && !userByPhone) {
			const createdUser = await Users.create({
				email,
				phoneNo,
				isActive: "N",
				roleId: 2
			});

			const getUser = await Users.findOne({
				where: { id: createdUser.id },
				include: [{ model: Roles }]
			});

			encryptHelper(getUser);
			return res.status(200).send({
				message: "OTP verified successfully. Account pending activation.",
				data: getUser
			});
		}

		// 🧩 Case 4: use whichever user was found
		const user = userByEmail || userByPhone;

		if (user.isActive === "N") {
			encryptHelper(user);
			return res.status(401).send({
				title: "User Not Active",
				message: "User not active, please contact admin",
				data: user
			});
		} else {
			encryptHelper(user);
			return res.status(200).send({
				title: "User Active",
				message: "User active, OTP verified successfully.",
				data: user
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

		if (!userExist) {
			return res.status(401).send({
				title: "Incorrect Email.",
				message: "Email does not exist in our system."
			});
		}

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
			attributes: ["id", "firstName", "lastName", "email", "roleId", "phoneNo", "imageURL", "modules"]
		});

		if (!user || userExist.password !== req.body.password) {
			return res.status(403).send({
				title: "Incorrect Logins",
				message: "Incorrect Email/Password"
			});
		}

		if (req.body.fcmToken) {
			await Users.update({ fcmToken: req.body.fcmToken }, { where: { id: user.id } });
		}

		encryptHelper(user);
		// create new JWT
		const token = jwt.signToken({
			userId: user.id,
			email: user.email,
			roleId: user.roleId,
			role: user.role.title
		});

		// Save token in Redis, overwrite old one
		await redis.set(`session:${user.id}`, token);

		res.status(200).send({
			message: "Logged in successful",
			data: { user },
			token,
			fcmToken: req.body?.fcmToken ? req.body?.fcmToken : ""
		});
	} catch (err) {
		console.error(err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
