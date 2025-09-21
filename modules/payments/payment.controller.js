const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const { uploadFileToS3 } = require("../../utils/awsServises");
const sequelize = db.sequelize; // ADD THIS LINE
const crypto = require("../../utils/crypto");

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
			planId: joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			await t.rollback();
			return res.status(400).send({ message: error.details[0].message });
		}

		const { amount, paymentMethod, currency, paymentIntentId } = req.body;

		if (!req.file) {
			await t.rollback();
			return res.status(400).send({
				success: false,
				message: "Image is required"
			});
		}

		const createUser = await User.create(
			{
				email: req.body.email,
				phoneNo: req.body.phoneNo,
				roleId: 2,
				isPayment: "Y",
				isActive: "N"
			},
			{
				transaction: t
			}
		);

		const file = req.file;
		const fileUrl = await uploadFileToS3(file, "payments");

		const payment = await Payment.create(
			{
				amount,
				paymentMethod,
				currency,
				paymentIntentId,
				image: fileUrl
			},
			{
				transaction: t
			}
		);

		await UserPlans.create(
			{
				userId: createUser.id,
				planId: crypto.decrypt(req.body.planId),
				isActive: "Y"
			},
			{
				transaction: t
			}
		);

		await t.commit();

		const getUser = await User.findOne({
			where: {
				id: createUser.id
			},
			include: [
				{
					model: UserPlans,
					include: [Plans]
				},
				{ model: Roles }
			]
		});

		encryptHelper(getUser);

		return res.status(200).json({
			success: true,
			message: "Payment & User created successfully",
			data: getUser
		});
	} catch (error) {
		await t.rollback();
		console.error("Error in create:", error);

		return res.status(500).json({
			success: false,
			message: error.message
		});
	}
};
