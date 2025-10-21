const db = require("../../models");
const Joi = require("joi");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");

const User = db.users;
const UserAssesmentProgress = db.userAssesmentProgress;
const Measurements = db.measurements;

// Joi schemas
const createProgressSchema = Joi.object({
	userId: Joi.string().required(),
	dayNumber: Joi.number().integer().required(),
	currentWeight: Joi.number().optional(),
	goalWeight: Joi.number().optional(),
	problemsFaced: Joi.string().optional(),
	problemsResolved: Joi.string().optional(),
	dietWorkoutProblems: Joi.string().optional(),
	positiveChanges: Joi.string().optional(),
	habitsIncluded: Joi.string().optional(),
	habitsDifficult: Joi.string().optional(),
	appFeedback: Joi.string().optional(),
	suggestions: Joi.string().optional(),
	likedFeatures: Joi.string().optional(),
	coachReview: Joi.string().optional(),
	periodDetails: Joi.string().optional(),
	measurements: Joi.object({
		day1Chest: Joi.number().optional(),
		day1RightArm: Joi.number().optional(),
		day1LeftArm: Joi.number().optional(),
		day1BellyButton: Joi.number().optional(),
		day1Waist: Joi.number().optional(),
		day1Hips: Joi.number().optional(),
		day1LeftThigh: Joi.number().optional(),
		day1RightThigh: Joi.number().optional(),
		day1Wrist: Joi.number().optional(),
		currentChest: Joi.number().optional(),
		currentRightArm: Joi.number().optional(),
		currentLeftArm: Joi.number().optional(),
		currentBellyButton: Joi.number().optional(),
		currentWaist: Joi.number().optional(),
		currentHips: Joi.number().optional(),
		currentLeftThigh: Joi.number().optional(),
		currentRightThigh: Joi.number().optional(),
		currentWrist: Joi.number().optional()
	}).optional()
});

const getUserProgressSchema = Joi.object({
	userId: Joi.string().required()
});

const getProgressByIdSchema = Joi.object({
	id: Joi.string().required()
});

const updateProgressSchema = Joi.object({
	currentWeight: Joi.number().optional(),
	goalWeight: Joi.number().optional(),
	problemsFaced: Joi.string().optional(),
	problemsResolved: Joi.string().optional(),
	dietWorkoutProblems: Joi.string().optional(),
	positiveChanges: Joi.string().optional(),
	habitsIncluded: Joi.string().optional(),
	habitsDifficult: Joi.string().optional(),
	appFeedback: Joi.string().optional(),
	suggestions: Joi.string().optional(),
	likedFeatures: Joi.string().optional(),
	coachReview: Joi.string().optional(),
	periodDetails: Joi.string().optional(),
	measurements: Joi.object({
		day1Chest: Joi.number().optional(),
		day1RightArm: Joi.number().optional(),
		day1LeftArm: Joi.number().optional(),
		day1BellyButton: Joi.number().optional(),
		day1Waist: Joi.number().optional(),
		day1Hips: Joi.number().optional(),
		day1LeftThigh: Joi.number().optional(),
		day1RightThigh: Joi.number().optional(),
		day1Wrist: Joi.number().optional(),
		currentChest: Joi.number().optional(),
		currentRightArm: Joi.number().optional(),
		currentLeftArm: Joi.number().optional(),
		currentBellyButton: Joi.number().optional(),
		currentWaist: Joi.number().optional(),
		currentHips: Joi.number().optional(),
		currentLeftThigh: Joi.number().optional(),
		currentRightThigh: Joi.number().optional(),
		currentWrist: Joi.number().optional()
	}).optional()
});

// Create a new progress record with measurements
exports.createProgress = async (req, res) => {
	try {
		const { error, value } = createProgressSchema.validate(req.body);
		if (error) {
			return res.status(400).json({ message: error.details[0].message });
		}

		const {
			userId,
			dayNumber,
			currentWeight,
			goalWeight,
			problemsFaced,
			problemsResolved,
			dietWorkoutProblems,
			positiveChanges,
			habitsIncluded,
			habitsDifficult,
			appFeedback,
			suggestions,
			likedFeatures,
			coachReview,
			periodDetails,
			measurements
		} = value;

		const decryptedUserId = crypto.decrypt(userId);

		// Create the progress record
		const progress = await UserAssesmentProgress.create({
			userId: decryptedUserId,
			dayNumber,
			currentWeight,
			goalWeight,
			problemsFaced,
			problemsResolved,
			dietWorkoutProblems,
			positiveChanges,
			habitsIncluded,
			habitsDifficult,
			appFeedback,
			suggestions,
			likedFeatures,
			coachReview,
			periodDetails
		});

		// Create measurements if provided
		if (measurements) {
			measurements.userAssesmentProgressId = progress.id;
			await Measurements.create(measurements);
		}

		const fullProgress = await UserAssesmentProgress.findOne({
			where: { id: progress.id },
			include: [{ model: Measurements }]
		});

		encryptHelper(fullProgress);

		return res.status(201).json({
			message: "Progress record created successfully",
			data: fullProgress
		});
	} catch (error) {
		console.error("Error creating progress:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};

// Fetch all progress records for a user
exports.getUserProgress = async (req, res) => {
	try {
		const { error, value } = getUserProgressSchema.validate(req.body);
		if (error) {
			return res.status(400).json({ message: error.details[0].message });
		}

		const { userId } = value;
		const decryptedUserId = crypto.decrypt(userId);

		const progressList = await UserAssesmentProgress.findAll({
			where: { userId: decryptedUserId },
			include: [{ model: Measurements }],
			order: [["dayNumber", "ASC"]]
		});

		if (!progressList.length) return res.status(404).json({ message: "No progress records found" });

		encryptHelper(progressList);

		return res.status(200).json({ data: progressList });
	} catch (error) {
		console.error("Error fetching progress:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};

// Get a single progress record by ID
exports.getProgressById = async (req, res) => {
	try {
		const { error, value } = getProgressByIdSchema.validate(req.params);
		if (error) {
			return res.status(400).json({ message: error.details[0].message });
		}

		const { id } = value;
		const decryptedId = crypto.decrypt(id);

		const progress = await UserAssesmentProgress.findOne({
			where: { id: decryptedId },
			include: [{ model: Measurements }]
		});

		if (!progress) return res.status(404).json({ message: "Progress not found" });

		encryptHelper(progress);

		return res.status(200).json({ data: progress });
	} catch (error) {
		console.error("Error fetching progress by id:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};

// Update a progress record and its measurements
exports.updateProgress = async (req, res) => {
	try {
		const { error, value } = updateProgressSchema.validate(req.body);
		if (error) {
			return res.status(400).json({ message: error.details[0].message });
		}

		const { id } = req.body;
		const decryptedId = crypto.decrypt(id);

		const {
			currentWeight,
			goalWeight,
			problemsFaced,
			problemsResolved,
			dietWorkoutProblems,
			positiveChanges,
			habitsIncluded,
			habitsDifficult,
			appFeedback,
			suggestions,
			likedFeatures,
			coachReview,
			periodDetails,
			measurements
		} = value;

		const progress = await UserAssesmentProgress.findByPk(decryptedId);
		if (!progress) {
			return res.status(404).json({ message: "Progress not found" });
		}

		await progress.update({
			currentWeight,
			goalWeight,
			problemsFaced,
			problemsResolved,
			dietWorkoutProblems,
			positiveChanges,
			habitsIncluded,
			habitsDifficult,
			appFeedback,
			suggestions,
			likedFeatures,
			coachReview,
			periodDetails
		});

		if (measurements) {
			const existing = await Measurements.findOne({ where: { userAssesmentProgressId: decryptedId } });
			if (existing) {
				await existing.update(measurements);
			} else {
				measurements.userAssesmentProgressId = decryptedId;
				await Measurements.create(measurements);
			}
		}

		const updated = await UserAssesmentProgress.findOne({
			where: { id: decryptedId },
			include: [{ model: Measurements }]
		});

		encryptHelper(updated);

		return res.status(200).json({
			message: "Progress updated successfully",
			data: updated
		});
	} catch (error) {
		console.error("Error updating progress:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};
