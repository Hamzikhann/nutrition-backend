const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const { uploadToS3 } = require("../../utils/awsServises");

const UserAssesmentForm = db.userAssesmentForm;
const UserAssesmentFormFiles = db.userAssesmentFormFiles;

exports.create = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const schema = joi.object({
			name: joi.string().required(),
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
			meals: joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const userId = crypto.decrypt(req.userId);
		const formPayload = { ...req.body, userId };

		// Create main form
		const userAssessmentFormData = await UserAssesmentForm.create(formPayload, { transaction: t });

		// Handle multiple files if present
		if (req.files && Array.isArray(req.files) && req.files.length > 0) {
			for (let file of req.files) {
				const s3Key = await uploadFileToS3(file, `userAssesmentForm/${userId}`);

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

		await t.commit();

		encryptHelper(userAssessmentFormData);
		return res.status(200).send({
			message: "User Assessment Form Created Successfully",
			data: userAssessmentFormData
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
