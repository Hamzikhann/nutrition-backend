const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const { uploadFileToS3 } = require("../../utils/awsServises");
const sequelize = db.sequelize; // ADD THIS LINE
const crypto = require("../../utils/crypto");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");

const Payment = db.payments;
const UserPlans = db.userPlans;
const User = db.users;
const Roles = db.roles;
const Plans = db.plans;

exports.create = async (req, res) => {
	const t = await sequelize.transaction();

	try {
		const schema = joi.object({
			email: joi.string().required(),
			phoneNo: joi.string().required(),
			amount: joi.string().required(),
			paymentMethod: joi.string().required(),
			currency: joi.string().required(),
			paymentIntentId: joi.string().required(),
			planId: joi.string().required(),
			userId: joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			await t.rollback();
			return res.status(400).send({ message: error.details[0].message });
		}

		const { amount, paymentMethod, currency, paymentIntentId } = req.body;
		console.log(req.body);
		// if (!req.file) {
		// 	await t.rollback();
		// 	return res.status(400).send({
		// 		success: false,
		// 		message: "Image is required"
		// 	});
		// }

		let userId = crypto.decrypt(req.body.userId); //req.userId
		console.log(userId);
		if (userId == null) {
			return res.status(400).send({
				success: false,
				message: "User not found"
			});
		}

		let existedUser = await User.findOne({
			where: { id: userId }
		});

		if (!existedUser) {
			return res.status(400).send({
				success: false,
				message: "User not found"
			});
		}

		const getPlans = await Plans.findOne({
			where: {
				id: crypto.decrypt(req.body.planId)
			}
		});

		if (!getPlans) {
			return res.status(400).send({
				success: false,
				message: "Plan not found"
			});
		}
		if (req.file) {
			const file = req.file;
			var fileUrl = await uploadFileToSpaces(file, "payments");
		}

		const updateUser = await User.update(
			{
				isPayment: "Y"
			},
			{
				where: {
					id: userId
				},
				transaction: t
			}
		);

		const payment = await Payment.create(
			{
				amount,
				paymentMethod,
				currency,
				paymentIntentId,
				image: fileUrl ? fileUrl : null,
				userId
			},
			{
				transaction: t
			}
		);

		await UserPlans.create(
			{
				userId: existedUser.id,
				duration: getPlans.duration,
				planId: crypto.decrypt(req.body.planId),
				isActive: "Y"
			},
			{
				transaction: t
			}
		);

		await t.commit();
		console.log(existedUser.id);
		const getUser = await User.findOne({
			where: {
				id: existedUser.id
			},
			include: [{ model: Roles }]
		});

		encryptHelper(getUser);

		return res.status(200).json({
			success: true,
			message: "Payment & User created successfully",
			data: getUser
		});
	} catch (error) {
		// await t.rollback();
		console.error("Error in create:", error);

		return res.status(500).json({
			success: false,
			message: error.message
		});
	}
};
