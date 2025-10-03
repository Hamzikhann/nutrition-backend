const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");
const crypto = require("../../utils/crypto");
const joi = require("joi");
const HowToUse = db.howTouses;
const HowToUseCategories = db.howTouseCategories;

exports.create = async (req, res) => {
	try {
		const schema = joi.object({
			title: joi.string().required(),
			categoryId: joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}
		const { title, categoryId } = req.body;

		const category = await HowToUseCategories.findOne({
			where: {
				id: crypto.decrypt(categoryId)
			}
		});

		if (!req.file) {
			return res.status(400).json({
				error: "No file uploaded"
			});
		}

		const media = await uploadFileToSpaces(req.file, "howToUse");

		const howToUse = await HowToUse.create({
			title,
			media,
			howTouseCategoryId: category.id
		});
		encryptHelper(howToUse);
		return res.status(200).json({
			message: "How To Use created successfully",
			howToUse
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Something went wrong"
		});
	}
};

exports.list = async (req, res) => {
	try {
		const howToUse = await HowToUseCategories.findAll({
			include: [
				{
					model: HowToUse,
					where: { isActive: "Y" },
					required: false
				}
			]
		});
		encryptHelper(howToUse);
		return res.status(200).json({
			message: "How To Use list",
			howToUse
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Something went wrong"
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = joi.object({
			title: joi.string().required(),
			id: joi.string().required(),
			categoryId: joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}
		const { title, categoryId, id } = req.body;
		let updateObje = {
			title,
			howTouseCategoryId: crypto.decrypt(categoryId)
		};

		if (req.file) {
			let media = await uploadFileToSpaces(req.file, "howToUse");
			updateObje.media = media;
		}
		console.log(updateObje);
		await HowToUse.update(updateObje, { where: { id: crypto.decrypt(id) } });
		return res.status(200).json({
			message: "How To Use updated successfully"
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Something went wrong"
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const { id } = req.body;
		await HowToUse.update({ isActive: "N" }, { where: { id: crypto.decrypt(id) } });
		return res.status(200).json({
			message: "How To Use deleted successfully"
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Something went wrong"
		});
	}
};

exports.createCategory = async (req, res) => {
	try {
		const schema = joi.object({
			title: joi.string().required()
		});
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}
		const { title } = req.body;
		const howToUseCategory = await HowToUseCategories.create({
			title
		});
		encryptHelper(howToUseCategory);
		return res.status(200).json({
			message: "How To Use Category created successfully",
			howToUseCategory
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Something went wrong"
		});
	}
};
