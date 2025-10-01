const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const { uploadFileToS3 } = require("../../utils/awsServises");
const { uploadFileToSpaces } = require("../../utils/digitalOceanServises");

const sequelize = db.sequelize; // ADD THIS LINE
const crypto = require("../../utils/crypto");
const Joi = require("@hapi/joi");
const { schema } = require("@hapi/joi/lib/compile");
const Banner = db.banners;

exports.create = async (req, res) => {
	try {
		const schema = Joi.object({
			link: Joi.string().required()
		});
		console.log(req.body);
		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		if (req.file) {
			const s3Key = await uploadFileToSpaces(req.file, "banners");
			req.body.image = s3Key;
		}

		const banner = await Banner.create(req.body);

		encryptHelper(banner);
		return res.status(200).send({
			message: "Banner created successfully",
			data: banner
		});
	} catch (e) {
		return res.status(400).send(e);
	}
};

exports.list = async (req, res) => {
	try {
		const banner = await Banner.findAll({ where: { isActive: "Y" } });
		encryptHelper(banner);
		return res.status(200).send({
			message: "Banner List",
			data: banner
		});
	} catch (e) {
		return res.status(400).send(e);
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			link: Joi.string().required(),
			id: Joi.string().required(),
			image: Joi.string().optional()
		});

		const { error } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		let updateObj = {
			link: req.body.link
		};
		if (req.file) {
			const s3Key = await uploadFileToSpaces(req.file, "banners");

			updateObj.image = s3Key;
		}

		const banner = await Banner.update(
			{
				...updateObj
			},
			{
				where: {
					id: crypto.decrypt(req.body.id) //req.body.id
				}
			}
		);
		encryptHelper(banner);
		return res.status(200).send({
			message: "Banner updated successfully",
			data: banner
		});
	} catch (e) {
		return res.status(400).send(e);
	}
};

exports.delete = async (req, res) => {
	try {
		const banner = await Banner.update(
			{ isActive: "N" },
			{
				where: {
					id: crypto.decrypt(req.body.id)
				}
			}
		);
		return res.status(200).send({
			message: "Banner deleted successfully",
			data: banner
		});
	} catch (e) {
		return res.status(400).send(e);
	}
};
