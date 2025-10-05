const db = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const joi = require("joi");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");

const { Op } = require("sequelize");

const CommunityCategories = db.communityCategories;
const CommunityPosts = db.communityPosts;
const CommunityLikes = db.communityLikes;
const CommunityLikesCounter = db.communitylikesCounter;
const CommunityComments = db.communityComments;
const User = db.users;
const CommunityPostMedia = db.communityPostMedia;
exports.createCategory = async (req, res) => {
	try {
		const joiSchema = joi.object({
			title: joi.string().required(),
			privacy: joi.string().required().allow("").allow(null)
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const exist = await CommunityCategories.findOne({
				where: {
					title: value.title
				}
			});
			if (exist) {
				return res.status(400).json({
					message: "Category already exists"
				});
			}
			const category = await CommunityCategories.create({
				title: value.title,
				privacy: value.privacy
			});
			encryptHelper(category);
			res.status(200).json({
				message: "Category created successfully",
				category
			});
		}
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};

exports.createPost = async (req, res) => {
	let transaction;
	try {
		const schema = joi.object({
			categoryId: joi.string().required(),
			title: joi.string().required(),
			content: joi.string().required(),
			access: joi.boolean().optional().default(false) // Better to use boolean
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const { categoryId, title, content, access } = value;
		const userId = crypto.decrypt(req.userId);
		const decryptedCategoryId = crypto.decrypt(categoryId);

		// Start transaction
		transaction = await db.sequelize.transaction();

		// Check category exists
		const category = await CommunityCategories.findOne({
			where: { id: decryptedCategoryId },
			transaction
		});

		if (!category) {
			await transaction.rollback();
			return res.status(400).json({
				message: "Category not found"
			});
		}

		// Check admin permissions for Announcements
		if (category.title == "Announcements" && req.role != "Administrator") {
			await transaction.rollback();
			return res.status(403).json({
				message: "Only admin can create announcements"
			});
		}

		// Create post
		const post = await CommunityPosts.create(
			{
				communityCategoryId: decryptedCategoryId,
				title,
				content,
				access: access ? "true" : "false", // Convert boolean to string if needed
				userId
			},
			{ transaction }
		);

		let mediaObj = [];

		// Handle multiple files - FIX: use req.files instead of req.file
		if (req.files && req.files.length > 0) {
			for (let i = 0; i < req.files.length; i++) {
				let obj = {
					communityPostId: post.id,
					media: await uploadFileToSpaces(req.files[i], "communityPosts") // Changed from imageUrl to media
				};
				mediaObj.push(obj);
			}

			if (mediaObj.length > 0) {
				await CommunityPostMedia.bulkCreate(mediaObj, { transaction });
			}
		}

		// Commit transaction
		await transaction.commit();

		encryptHelper(post);
		res.status(200).json({
			message: "Post created successfully",
			post
		});
	} catch (err) {
		// Rollback transaction if it exists
		if (transaction) await transaction.rollback();

		console.log("Error in createPost:", err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};

exports.listCategories = async (req, res) => {
	try {
		const categories = await CommunityCategories.findAll({ where: { isActive: "Y" } });
		encryptHelper(categories);
		res.status(200).json({
			message: "Categories list",
			categories
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};

exports.listPosts = async (req, res) => {
	try {
		const { date } = req.body; // This is in user's local timezone (e.g., "2024-01-15")

		let whereCondition = { isActive: "Y" };
		if (date) {
			// The date comes from user's device in their local timezone
			// We need to convert it to UTC for proper comparison with server-stored dates

			// Get user's timezone offset (you might need to send this from frontend)
			// For now, we'll use the device's local timezone
			const userTimezoneOffset = new Date().getTimezoneOffset() * 60 * 1000; // in milliseconds

			// Create start and end of day in user's local timezone
			const startOfDayLocal = new Date(date + "T00:00:00");
			const endOfDayLocal = new Date(date + "T23:59:59.999");

			// Convert to UTC for database comparison
			const startOfDayUTC = new Date(startOfDayLocal.getTime() - userTimezoneOffset);
			const endOfDayUTC = new Date(endOfDayLocal.getTime() - userTimezoneOffset);

			whereCondition.createdAt = {
				[Op.between]: [startOfDayUTC, endOfDayUTC]
			};
		}

		const posts = await CommunityCategories.findAll({
			include: [
				{
					model: CommunityPosts,
					where: whereCondition,
					include: [
						{
							model: CommunityLikes,
							include: [
								{
									model: db.users,
									attributes: ["id", "firstName", "lastName"],
									include: [
										{
											model: db.roles,
											attributes: ["title"]
										}
									]
								}
							]
						},
						{
							model: CommunityLikesCounter,
							attributes: ["reactionType", "count"]
						},
						{
							model: CommunityPostMedia,
							required: false,
							where: { isActive: "Y" }
						}
					]
				}
			],
			order: [["createdAt", "DESC"]]
		});

		encryptHelper(posts);

		res.status(200).json({
			message: "Posts list",
			posts
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};
exports.detail = async (req, res) => {
	try {
		const joiSchema = joi.object({
			categoryId: joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const category = await CommunityCategories.findOne({
				where: {
					id: crypto.decrypt(value.categoryId)
				}
			});
			if (!category) {
				return res.status(400).json({
					message: "Category not found"
				});
			}
			let posts = await CommunityPosts.findAll({
				where: {
					communityCategoryId: crypto.decrypt(value.categoryId),
					isActive: "Y"
				},
				include: [
					{
						model: CommunityLikes,
						include: [
							{
								model: db.users,
								attributes: ["id", "firstName", "lastName"],
								include: [
									{
										model: db.roles,
										attributes: ["title"]
									}
								]
							}
						]
					},
					{
						model: User,
						attributes: ["id", "firstName", "lastName"],

						include: [{ model: db.roles, attributes: ["title"] }]
					},
					{
						model: CommunityPostMedia,
						required: false,
						where: { isActive: "Y" }
					}
				],
				order: [["createdAt", "DESC"]]
			});

			// Add comment counts manually
			for (let post of posts) {
				const count = await CommunityComments.count({
					where: { communityPostId: post.id }
				});
				post.setDataValue("commentsCount", count);
			}

			encryptHelper(posts);
			res.status(200).json({
				message: "Posts detail",
				posts
			});
		}
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};

exports.deletePost = async (req, res) => {
	try {
		const joiSchema = joi.object({
			postId: joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const post = await CommunityPosts.findOne({
				where: {
					id: crypto.decrypt(value.postId)
				}
			});
			if (!post) {
				return res.status(400).json({
					message: "Post not found"
				});
			}

			await CommunityPosts.update(
				{
					isActive: "N"
				},
				{
					where: {
						id: crypto.decrypt(value.postId)
					}
				}
			);

			return res.status(200).json({
				message: "Post deleted successfully"
			});
		}
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};

exports.updatePost = async (req, res) => {
	let transaction;
	try {
		const joiSchema = joi.object({
			postId: joi.string().required(),
			title: joi.string().required(),
			content: joi.string().required(),
			categoryId: joi.string().required(),
			access: joi.string().optional().allow("").allow(null),
			imagesToRemove: joi.string().optional().allow("") // Array of image IDs to remove
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const decryptedPostId = crypto.decrypt(value.postId);

		// Start transaction
		transaction = await db.sequelize.transaction();

		const post = await CommunityPosts.findOne({
			where: {
				id: decryptedPostId
			},
			transaction
		});

		if (!post) {
			await transaction.rollback();
			return res.status(400).json({
				message: "Post not found"
			});
		}

		let updateObj = {
			title: value.title,
			content: value.content,
			communityCategoryId: crypto.decrypt(value.categoryId),
			access: value.access
		};

		console.log("Received imagesToRemove:", value.imagesToRemove);

		// Handle image removal
		if (value.imagesToRemove && value.imagesToRemove.trim() !== "") {
			try {
				const imagesToRemove = JSON.parse(value.imagesToRemove);
				console.log("Parsed imagesToRemove:", imagesToRemove);

				if (Array.isArray(imagesToRemove) && imagesToRemove.length > 0) {
					// Remove duplicates (you had duplicate IDs in your payload)
					const uniqueImagesToRemove = [...new Set(imagesToRemove)];
					console.log("Unique images to remove:", uniqueImagesToRemove);

					// Remove old main image if it's in the removal list
					if (uniqueImagesToRemove.includes("old-main-image")) {
						console.log("Removing old main image");
						updateObj.image = null; // Clear the old image field
					}

					// Remove images from CommunityPostMedia table
					const mediaIdsToRemove = uniqueImagesToRemove.filter((id) => id !== "old-main-image");
					console.log("Media IDs to remove:", mediaIdsToRemove);

					if (mediaIdsToRemove.length > 0) {
						// Decrypt the media IDs if they're encrypted
						const decryptedMediaIds = mediaIdsToRemove
							.map((id) => {
								try {
									return crypto.decrypt(id);
								} catch (decryptError) {
									console.log("Error decrypting media ID:", id, decryptError);
									return null;
								}
							})
							.filter((id) => id !== null);

						console.log("Decrypted media IDs to remove:", decryptedMediaIds);

						if (decryptedMediaIds.length > 0) {
							await CommunityPostMedia.update(
								{ isActive: "N" },
								{
									where: {
										id: decryptedMediaIds,
										communityPostId: decryptedPostId
									},
									transaction
								}
							);
							console.log(`Soft deleted ${decryptedMediaIds.length} media records`);
						}
					}
				}
			} catch (parseError) {
				console.log("Error parsing imagesToRemove:", parseError);
				// Continue without removing images if parsing fails
			}
		}

		let mediaObj = [];

		// Handle new file uploads - FIX: use req.files instead of req.file
		if (req.files && req.files.length > 0) {
			console.log(`Processing ${req.files.length} new files`);
			for (let i = 0; i < req.files.length; i++) {
				try {
					const mediaUrl = await uploadFileToSpaces(req.files[i], "communityPosts");
					let obj = {
						communityPostId: decryptedPostId,
						media: mediaUrl
					};
					mediaObj.push(obj);
					console.log(`Uploaded file ${i + 1}: ${mediaUrl}`);
				} catch (uploadError) {
					console.log(`Error uploading file ${i + 1}:`, uploadError);
					// Continue with other files if one fails
				}
			}
		}

		console.log("Update object:", updateObj);

		// Update post
		const [updatedCount] = await CommunityPosts.update(updateObj, {
			where: {
				id: decryptedPostId
			},
			transaction
		});
		console.log(`Updated ${updatedCount} post record(s)`);

		// Add new media
		if (mediaObj.length > 0) {
			const createdMedia = await CommunityPostMedia.bulkCreate(mediaObj, { transaction });
			console.log(`Created ${createdMedia.length} new media records`);
		}

		// Commit transaction
		await transaction.commit();

		return res.status(200).json({
			message: "Post updated successfully",
			updated: true,
			imagesRemoved: value.imagesToRemove ? JSON.parse(value.imagesToRemove).length : 0,
			imagesAdded: mediaObj.length
		});
	} catch (err) {
		// Rollback transaction if it exists
		if (transaction) {
			console.log("Rolling back transaction due to error");
			await transaction.rollback();
		}

		console.log("Error in updatePost:", err);
		res.status(500).json({
			message: "Internal server error",
			error: err.message
		});
	}
};

exports.updateCategory = async (req, res) => {
	try {
		const joiSchema = joi.object({
			id: joi.string().required(),
			title: joi.string().required(),
			privacy: joi.string().optional().allow("").allow(null)
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const category = await CommunityCategories.findOne({
				where: {
					id: crypto.decrypt(value.id)
				}
			});
			if (!category) {
				return res.status(400).json({
					message: "Category not found"
				});
			}

			await CommunityCategories.update(
				{
					title: value.title,
					privacy: value.privacy
				},
				{
					where: {
						id: crypto.decrypt(value.id)
					}
				}
			);

			return res.status(200).json({
				message: "Category updated successfully"
			});
		}
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};

exports.deleteCategory = async (req, res) => {
	try {
		const joiSchema = joi.object({
			id: joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const category = await CommunityCategories.findOne({
				where: {
					id: crypto.decrypt(value.id)
				}
			});
			if (!category) {
				return res.status(400).json({
					message: "Category not found"
				});
			}
			let updateCategory = await CommunityCategories.update(
				{
					isActive: "N"
				},
				{
					where: {
						id: crypto.decrypt(req.body.id)
					}
				}
			);

			return res.status(201).send({ message: "Group Deleted" });
		}
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};
