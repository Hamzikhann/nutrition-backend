const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const { uploadFileToS3 } = require("../../utils/awsServises");
const sequelize = db.sequelize; // ADD THIS LINE

const UserAssesmentForm = db.userAssesmentForm;
const UserAssesmentFormFiles = db.userAssesmentFormFiles;
const Payment = db.payments;
const User = db.users;
const UserPlans = db.userPlans;

exports.create = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const schema = joi.object({
			name: joi.string().required(),
			userId: joi.string().required(),
			email: joi.string().required(),
			country: joi.string().optional(),
			whatsAppContact: joi.string().optional(),
			martialStatus: joi.string().optional(),
			weight: joi.string().optional(),
			height: joi.string().optional(),
			age: joi.string().optional(),
			physicalActivity: joi.string().optional(),
			purpose: joi.string().optional(),
			pocsDuration: joi.string().optional(),
			pcosSymptoms: joi.string().optional(),
			medicalHistory: joi.string().optional(),
			lastPeriods: joi.string().optional(),
			medicalConditions: joi.string().required(),
			medicines: joi.string().required(),
			ultrasoundHormonalTests: joi.string().required(),
			breakfastOptions: joi.string().required(),
			lunchOptions: joi.string().required(),
			dinnerOptions: joi.string().required(),
			snacksOptions: joi.string().required(),
			meals: joi.string().required(),
			planId: joi.string().required(),
			amount: joi.string().required(),
			paymentMethod: joi.string().required(),
			currency: joi.string().required(),
			paymentIntentId: joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const userId = crypto.decrypt(req.body.userId);
		console.log(req.body);
		// Create form payload
		const formPayload = {
			name: req.body.name ? req.body.name : "",
			email: req.body.email ? req.body.email : "",
			country: req.body.country ? req.body.country : "",
			whatsAppContact: req.body.whatsAppContact ? req.body.whatsAppContact : "",
			martialStatus: req.body.martialStatus ? req.body.martialStatus : "",
			weight: req.body.weight ? req.body.weight : "",
			height: req.body.height ? req.body.height : "",
			age: req.body.age ? req.body.age : "",
			physicalActivity: req.body.physicalActivity ? req.body.physicalActivity : "",
			purpose: req.body.purpose ? req.body.purpose : "",
			pocsDuration: req.body.pocsDuration ? req.body.pocsDuration : "",
			pcosSymptoms: req.body.pcosSymptoms ? req.body.pcosSymptoms : "",
			medicalHistory: req.body.medicalHistory ? req.body.medicalHistory : "",
			lastPeriods: req.body.lastPeriods ? req.body.lastPeriods : "",
			medicalConditions: req.body.medicalConditions ? req.body.medicalConditions : "",
			medicines: req.body.medicines ? req.body.medicines : "",
			ultrasoundHormonalTests: req.body.ultrasoundHormonalTests ? req.body.ultrasoundHormonalTests : "",
			breakfastOptions: req.body.breakfastOptions ? req.body.breakfastOptions : "",
			lunchOptions: req.body.lunchOptions ? req.body.lunchOptions : "",
			dinnerOptions: req.body.dinnerOptions ? req.body.dinnerOptions : "",
			snacksOptions: req.body.snacksOptions ? req.body.snacksOptions : "",
			meals: req.body.meals ? req.body.meals : "",
			planId: req.body.planId ? crypto.decrypt(req.body.planId) : "",

			userId,
			paymentId: null // Will be updated after payment creation
		};

		// Create payment
		const paymentPayload = {
			amount: req.body.amount,
			currency: req.body.currency,
			paymentMethod: req.body.paymentMethod,
			status: "pending",
			paymentIntentId: req.body.paymentIntentId,
			userId: userId
		};

		const paymentData = await Payment.create(paymentPayload, { transaction: t });

		// Update form payload with payment ID
		formPayload.paymentId = paymentData.id;

		// Create main form
		const userAssessmentFormData = await UserAssesmentForm.create(formPayload, { transaction: t });

		// Handle assessment files (media)
		if (req.files && req.files["media"] && Array.isArray(req.files["media"])) {
			for (let file of req.files["media"]) {
				const s3Key = await uploadFileToS3(file, `userAssesmentForm/${userId}/assessment`);

				await UserAssesmentFormFiles.create(
					{
						userId,
						userAssesmentFormId: userAssessmentFormData.id,
						fileName: file.originalname,
						fileType: file.mimetype,
						filePath: s3Key
					},
					{ transaction: t }
				);
			}
		}

		// Handle payment screenshot
		if (req.files && req.files["image"] && Array.isArray(req.files["image"])) {
			const paymentFile = req.files["image"][0]; // Get first payment screenshot
			const s3Key = await uploadFileToS3(paymentFile, `userAssesmentForm/${userId}/payment`);

			await UserAssesmentFormFiles.create(
				{
					userId,
					userAssesmentFormId: userAssessmentFormData.id,
					fileName: paymentFile.originalname,
					fileType: paymentFile.mimetype,
					filePath: s3Key
				},
				{ transaction: t }
			);

			await User.update({ isPaid: "Y" }, { where: { id: userId }, transaction: t });

			await UserPlans.create(
				{
					userId: userId,
					planId: req.body.planId ? crypto.decrypt(req.body.planId) : "",
					isActive: "Y"
				},
				{ transaction: t }
			);

			// Also update payment record with screenshot reference if needed
			await Payment.update({ image: s3Key }, { where: { id: paymentData.id }, transaction: t });
		}

		await t.commit();

		// Fetch complete data with associations if needed
		const completeData = await UserAssesmentForm.findOne({
			where: { id: userAssessmentFormData.id },
			include: [
				{
					model: UserAssesmentFormFiles
				}
			]
		});

		encryptHelper(completeData);
		return res.status(200).send({
			message: "User Assessment Form Created Successfully",
			data: completeData
		});
	} catch (err) {
		await t.rollback();
		console.error("Error creating User Assessment Form:", err);
		return res.status(500).send({ message: err.message || "Internal Server Error" });
	}
};
exports.update = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const schema = joi.object({
			id: joi.number().required(),
			name: joi.string().optional(),
			email: joi.string().optional(),
			country: joi.string().optional(),
			whatsAppContact: joi.string().optional(),
			martialStatus: joi.string().optional(),
			weight: joi.string().optional(),
			height: joi.string().optional(),
			age: joi.string().optional(),
			physicalActivity: joi.string().optional(),
			purpose: joi.string().optional(),
			pocsDuration: joi.string().optional(),
			pcosSymptoms: joi.string().optional(),
			medicalHistory: joi.string().optional(),
			lastPeriods: joi.string().optional(),
			medicalConditions: joi.string().optional(),
			medicines: joi.string().optional(),
			ultrasoundHormonalTests: joi.string().optional(),
			breakfastOptions: joi.string().optional(),
			lunchOptions: joi.string().optional(),
			dinnerOptions: joi.string().optional(),
			snacksOptions: joi.string().optional(),
			meals: joi.string().optional()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}
		const { id } = req.body;
		const userAssessmentFormData = await UserAssesmentForm.findByPk(id);
		if (!userAssessmentFormData) {
			return res.status(404).send({ message: "User Assessment Form not found" });
		}
		await userAssessmentFormData.update(req.body, { transaction: t });
		await t.commit();
		encryptHelper(userAssessmentFormData);
		return res.status(200).send({
			message: "User Assessment Form Updated Successfully",
			data: userAssessmentFormData
		});
	} catch (err) {
		await t.rollback();
		console.error("Error updating User Assessment Form:", err);
		return res.status(500).send({ message: err.message || "Internal Server Error" });
	}
};

exports.updateFiles = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const schema = joi.object({
			id: joi.number().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}
		const { id } = req.body;
		const userAssessmentFormData = await UserAssesmentForm.findByPk(id);
		if (!userAssessmentFormData) {
			return res.status(404).send({ message: "User Assessment Form not found" });
		}
		await userAssessmentFormData.update(req.body, { transaction: t });
		await t.commit();
		encryptHelper(userAssessmentFormData);
		return res.status(200).send({
			message: "User Assessment Form Updated Successfully",
			data: userAssessmentFormData
		});
	} catch (err) {
		await t.rollback();
		console.error("Error updating User Assessment Form Files:", err);
		return res.status(500).send({ message: err.message || "Internal Server Error" });
	}
};
