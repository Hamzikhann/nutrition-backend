const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");

const sequelize = db.sequelize;
const { Op, literal } = db.Sequelize;
const UserAssesmentForm = db.userAssesmentForm;
const UserAssesmentFormFiles = db.userAssesmentFormFiles;
const AssignedMeals = db.assignedMeals;
const Meals = db.meals;
const MealsType = db.mealTypes;
const Categories = db.categories;

const calculateKcalPlan = (weight, height, age) => {
	const bmr = 655.1 + 9.6 * parseFloat(weight) + 1.58 * parseFloat(height) - 4.7 * parseFloat(age);
	const adjustedBmr = bmr * 1.3 - 500;

	let kcalPlan;
	if (adjustedBmr >= 1951) {
		kcalPlan = 2000;
	} else if (adjustedBmr >= 1851) {
		kcalPlan = 1900;
	} else if (adjustedBmr >= 1751) {
		kcalPlan = 1800;
	} else if (adjustedBmr >= 1651) {
		kcalPlan = 1700;
	} else if (adjustedBmr >= 1551) {
		kcalPlan = 1600;
	} else if (adjustedBmr >= 1451) {
		kcalPlan = 1500;
	} else if (adjustedBmr >= 1351) {
		kcalPlan = 1400;
	} else {
		kcalPlan = 1300;
	}

	return { bmr, adjustedBmr, kcalPlan };
};

exports.create = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const schema = joi.object({
			name: joi.string().required(),
			userId: joi.string().required(),
			email: joi.string().required(),
			country: joi.string().optional().allow("").allow(null),
			whatsAppContact: joi.string().optional().allow("").allow(null),
			maritalStatus: joi.string().optional().allow("").allow(null),
			weight: joi.string().required(),
			height: joi.string().required(),
			age: joi.string().required(),
			physicalActivity: joi.string().optional().allow("").allow(null),
			purpose: joi.string().optional().allow("").allow(null),
			pcosDuration: joi.string().optional().allow("").allow(null),
			pcosSymptoms: joi.string().optional().allow("").allow(null),
			// medicalHistory: joi.string().optional(),
			// lastPeriods: joi.string().optional(),
			medicalConditions: joi.string().optional().allow("").allow(null),
			medicines: joi.string().optional().allow("").allow(null),
			ultrasoundHormonalTests: joi.string().optional().allow("").allow(null),
			breakfastOptions: joi.string().optional().allow("").allow(null),
			lunchOptions: joi.string().optional().allow("").allow(null),
			dinnerOptions: joi.string().optional().allow("").allow(null),
			snacksOptions: joi.string().optional().allow("").allow(null),
			additionalDetails: joi.string().optional().allow("").allow(null),
			periodDetails: joi.string().optional().allow("").allow(null),
			supplements: joi.string().optional().allow("").allow(null),
			working: joi.string().optional().allow("").allow(null),
			meals: joi.string().optional().allow("").allow(null)
		});
		console.log(req.body);
		const { error } = schema.validate(req.body);
		if (error) {
			console.log(error);
			return res.status(400).send({ message: error.details[0].message });
		}
		console.log(req.body);
		const userId = crypto.decrypt(req.body.userId);
		// Create form payload
		const formPayload = {
			name: req.body.name ? req.body.name : "",
			email: req.body.email ? req.body.email : "",
			country: req.body.country ? req.body.country : "",
			whatsAppContact: req.body.whatsAppContact ? req.body.whatsAppContact : "",
			martialStatus: req.body.maritalStatus ? req.body.maritalStatus : "",
			weight: req.body.weight ? req.body.weight : "",
			height: req.body.height ? req.body.height : "",
			age: req.body.age ? req.body.age : "",
			physicalActivity: req.body.physicalActivity ? req.body.physicalActivity : "",
			purpose: req.body.purpose ? req.body.purpose : "",
			pocsDuration: req.body.pcosDuration ? req.body.pcosDuration : "",
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

			userId
		};

		// Create main form
		const userAssessmentFormData = await UserAssesmentForm.create(formPayload, { transaction: t });
		if (userAssessmentFormData) {
			console.log(userAssessmentFormData.id);
		}
		// Handle assessment files (media)
		if (req.files) {
			console.log("filesssss", req.files["media"]);
			for (let file of req.files) {
				const s3Key = await uploadFileToSpaces(file, `userAssesmentForm/${userId}/assessment`);

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
		console.log(req.body.weight, req.body.height, req.body.age);
		// Calculate kcal plan and assign meals
		const { bmr, adjustedBmr, kcalPlan } = calculateKcalPlan(req.body.weight, req.body.height, req.body.age);
		console.log(kcalPlan);
		console.log(adjustedBmr);
		console.log(bmr);
		// Find meal plans that match the calculated kcal
		const matchingMeals = await Meals.findAll({
			where: {
				isActive: "Y",
				[Op.and]: [literal(`CONCAT(',', kcalOptions, ',') LIKE '%,${kcalPlan},%'`)]
			},
			attributes: {
				exclude: ["isActive", "createdAt", "updatedAt"]
			}
		}); // Assign meals to user in assignedMeals table
		for (const meal of matchingMeals) {
			await AssignedMeals.create(
				{
					userId,
					mealId: meal.id,
					assessmentId: userAssessmentFormData.id,
					mealTypeId: meal.mealTypeId,
					calculatedKcal: kcalPlan,
					userAssesmentFormId: userAssessmentFormData.id
				},
				{ transaction: t }
			);
		}

		// Commit before fetching complete data
		await t.commit();
		let updateuser = await db.users.update(
			{
				isFormCreated: "Y"
			},
			{ where: { id: userId } }
		);
		// Fetch complete data with associations if needed
		const completeData = await UserAssesmentForm.findOne({
			where: { id: userAssessmentFormData.id },
			include: [
				{
					model: UserAssesmentFormFiles,
					required: false
				}
				// {
				// 	model: AssignedMeals,
				// 	include: [
				// 		{
				// 			model: Meals,
				// 			include: [
				// 				{
				// 					model: MealsType,
				// 					attributes: ["title"]
				// 				},
				// 				{
				// 					model: Categories,
				// 					attributes: ["title"]
				// 				}
				// 			]
				// 		}
				// 	]
				// }
			]
		});

		encryptHelper(completeData);
		return res.status(200).send({
			message: "User Assessment Form Created Successfully with Assigned Meals",
			data: completeData
		});
	} catch (err) {
		if (!t.finished) await t.rollback();
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
		if (!t.finished) await t.rollback();
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
		if (!t.finished) await t.rollback();
		console.error("Error updating User Assessment Form Files:", err);
		return res.status(500).send({ message: err.message || "Internal Server Error" });
	}
};

exports.getAssignedMeals = async (req, res) => {
	try {
		const schema = joi.object({
			userId: joi.string().required()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const userId = crypto.decrypt(req.body.userId);

		const assignedMeals = await AssignedMeals.findAll({
			where: {
				userId,
				isActive: "Y"
			},
			include: [
				{
					model: Meals,
					include: [
						{
							model: MealsType,
							attributes: ["title"]
						},
						{
							model: Categories,
							attributes: ["title"]
						}
					],
					attributes: {
						exclude: ["isActive", "createdAt", "updatedAt"]
					}
				},
				{
					model: UserAssesmentForm,
					attributes: ["name", "email", "weight", "height", "age"]
				}
			],
			attributes: {
				exclude: ["isActive", "createdAt", "updatedAt"]
			}
		});

		// Group meals by meal type
		const groupedMeals = {};
		assignedMeals.forEach((assignment) => {
			const mealType = assignment.meal.mealType.title;
			if (!groupedMeals[mealType]) {
				groupedMeals[mealType] = [];
			}
			groupedMeals[mealType].push(assignment);
		});

		encryptHelper(assignedMeals);
		return res.status(200).send({
			message: "Assigned meals retrieved successfully",
			data: {
				groupedByMealType: groupedMeals,
				allMeals: assignedMeals
			}
		});
	} catch (err) {
		console.error("Error retrieving assigned meals:", err);
		return res.status(500).send({ message: err.message || "Internal Server Error" });
	}
};
