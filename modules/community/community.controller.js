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

exports.createCategory = async (req, res) => {
	try {
		const joiSchema = joi.object({
			title: joi.string().required(),
			privacy: joi.string().required()
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
	try {
		const schema = joi.object({
			categoryId: joi.string().required(),
			title: joi.string().required(),
			content: joi.string().required(),
			access: joi.string().optional().allow("").allow(null)
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}
		const { categoryId, title, content } = value;
		const userId = crypto.decrypt(req.userId);

		// if (!req.file) {
		// 	res.status(400).json({
		// 		message: "Image is required"
		// 	});
		// }
		const category = await CommunityCategories.findOne({
			where: {
				id: crypto.decrypt(categoryId)
			}
		});

		if (category.title == "Announcements" && req.role != "Administrator") {
			return res.status(400).json({
				message: "Only admin can create announcements"
			});
		}

		if (!category) {
			return res.status(400).json({
				message: "Category not found"
			});
		}
		let imageUrl = "";
		if (req.file) {
			imageUrl = await uploadFileToSpaces(req.file, "communityPosts");
		}

		const post = await CommunityPosts.create({
			communityCategoryId: crypto.decrypt(categoryId),
			title,
			content,
			image: imageUrl ? imageUrl : "",
			access: value.access ? value.access == "true" : "false",
			userId
		});
		encryptHelper(post);
		res.status(200).json({
			message: "Post created successfully",
			post
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error"
		});
	}
};

exports.listCategories = async (req, res) => {
	try {
		const categories = await CommunityCategories.findAll();
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
		// Expecting a query param or body param: YYYY-MM-DD
		const { date } = req.body; // or req.body

		let whereCondition = { isActive: "Y" };
		if (date) {
			// Normalize to cover the whole day
			const startOfDay = new Date(date);
			startOfDay.setHours(0, 0, 0, 0);

			const endOfDay = new Date(date);
			endOfDay.setHours(23, 59, 59, 999);

			whereCondition.createdAt = {
				[Op.between]: [startOfDay, endOfDay]
			};
		}

		const posts = await CommunityCategories.findAll({
			include: [
				{
					model: CommunityPosts,
					where: whereCondition, // ✅ filter posts by date
					include: [
						{
							model: CommunityLikes, // all user reactions
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
							model: CommunityLikesCounter, // aggregated counters
							attributes: ["reactionType", "count"]
						}
					]
				}
			]
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
					}
				]
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
