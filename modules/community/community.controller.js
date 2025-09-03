const db = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const joi = require("joi");
const { uploadFileToS3 } = require("../../utils/awsServises");

const CommunityCategories = db.communityCategories;
const CommunityPosts = db.communityPosts;

exports.createCategory = async (req, res) => {
	try {
		const joiSchema = joi.object({
			title: joi.string().required()
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
				title: value.title
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
			content: joi.string().required()
		});
		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}
		const { categoryId, title, content } = value;

		if (!req.file) {
			res.status(400).json({
				message: "Image is required"
			});
		}

		const imageUrl = await uploadFileToS3(req.file, "communityPosts");

		const category = await CommunityCategories.findOne({
			where: {
				id: crypto.decrypt(categoryId)
			}
		});
		if (!category) {
			res.status(400).json({
				message: "Category not found"
			});
		}

		const post = await CommunityPosts.create({
			communityCategoryId: crypto.decrypt(categoryId),
			title,
			content,
			image: imageUrl
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
		const posts = await CommunityCategories.findAll({
			include: [
				{
					model: CommunityPosts
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
