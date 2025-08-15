const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const { uploadFileToS3, getFileUrl } = require("../../utils/awsServises");

const Highlights = db.highlights;
const HighlightItems = db.highlightItems;

exports.create = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			title: Joi.string().required(),
			caption: Joi.string().required(),
			duration: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			if (!req.file) {
				return res.status(400).json({ error: "No file uploaded" });
			}
			console.log(req.file);

			// Determine media type
			const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "photo";
			let userId = crypto.decrypt(req.userId);

			// Upload to S3
			const s3Key = await uploadFileToS3(
				req.file,
				`highlights/${userId}` // Organize by user ID
			);

			// Create highlight record
			const highlight = await Highlights.create({
				userId: userId,
				title: req.body.title || "Untitled Highlight"
			});

			// Create highlight item
			const highlightItem = await HighlightItems.create({
				highlightId: highlight.id,
				userId: userId,
				mediaType,
				mediaUrl: s3Key,
				caption: req.body.caption || "",
				duration: mediaType === "video" ? req.body.duration || 0 : null
			});

			// Prepare response with full URLs
			const response = {
				...highlight.get({ plain: true }),
				items: [
					{
						...highlightItem.get({ plain: true }),
						mediaUrl: getFileUrl(s3Key)
					}
				]
			};

			res.status(201).json({
				success: true,
				message: "Highlight created successfully",
				data: response
			});
		}
	} catch (error) {
		console.error("Error creating highlight:", error);
		res.status(500).json({
			success: false,
			message: "Failed to create highlight",
			error: error.message
		});
	}
};

exports.list = async (req, res) => {
	try {
		const highlights = await Highlights.findAll({
			include: [
				{
					model: HighlightItems
				}
			]
		});

		encryptHelper(highlights);

		res.status(200).json({
			success: true,
			message: "Highlights retrieved successfully",
			data: highlights
		});
	} catch (error) {
		console.error("Error retrieving highlights:", error);
		res.status(500).json({
			success: false,
			message: "Failed to retrieve highlights",
			error: error.message
		});
	}
};

exports.createHighlightItem = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			highlightId: Joi.string().required(),
			caption: Joi.string().optional(),
			duration: Joi.number().optional()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			let userId = crypto.decrypt(req.userId);
			let highlightId = crypto.decrypt(req.body.highlightId);

			if (!req.file) {
				return res.status(400).json({ error: "No file uploaded" });
			}
			// Determine media type
			const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "photo";

			const s3Key = await uploadFileToS3(
				req.file,
				`highlights/${userId}` // Organize by user ID
			);

			let createHighlightItem = await HighlightItems.create({
				highlightId: highlightId,
				userId: userId,
				mediaType: mediaType,

				mediaUrl: s3Key,
				caption: req.body.caption,
				duration: mediaType === "video" ? req.body.duration || 0 : null
			});

			return res.status(200).send({
				message: "Highlight item created successfully.",
				data: createHighlightItem
			});
		}
	} catch (error) {
		return res.status(500).send({
			message: error.message
		});
	}
};
