const db = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const Joi = require("@hapi/joi");

const Users = db.users;
const Notification = db.notifications;
const Booking = db.bookings;

exports.list = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			userId: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userId = req.body.userId ? crypto.decrypt(req.body.userId) : req.body.userId;
			Notification.findAll({
				where: {
					userId: userId,
					isActive: "Y"
				},
				attributes: {
					exclude: ["updatedAt"]
				},
				include: [
					{
						model: Users,
						where: { isActive: "Y" },
						attributes: ["id"],
						include: [
							{
								model: Booking,
								attributes: ["id"],
								where: { isActive: "Y" },
								required: false
							}
						]
					}
				]
			})
				.then((response) => {
					encryptHelper(response);

					res.status(200).send({
						message: "Notification Fetched",
						data: response
					});
				})
				.catch((err) => {
					emails.errorEmail(req, err);
					res.status(500).send({
						message: err.message || "Some error occurred."
					});
				});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.updateIsRead = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			// userId: Joi.string().required(),
			notificationIds: Joi.array().items(Joi.string()).required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			let notificationIds = req.body.notificationIds;
			let userId = crypto.decrypt(req.userId);

			const decryptedIds = notificationIds.map((id) => crypto.decrypt(id));

			Notification.update(
				{ isRead: true },
				{
					where: {
						id: decryptedIds,
						userId: userId,
						isActive: "Y"
					}
				}
			)
				.then((response) => {
					res.status(200).send({
						message: "Notification Updated"
					});
				})
				.catch((err) => {
					emails.errorEmail(req, err);
					res.status(500).send({
						message: err.message || "Some error occurred."
					});
				});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			// userId: Joi.string().required(),
			notificationIds: Joi.array().items(Joi.string()).required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			let notificationIds = req.body.notificationIds;
			let userId = crypto.decrypt(req.userId);
			const decryptedIds = notificationIds.map((id) => crypto.decrypt(id));

			Notification.update(
				{ isActive: "N" },
				{
					where: {
						id: decryptedIds,
						userId: userId,
						isActive: "Y"
					}
				}
			)
				.then((response) => {
					res.status(200).send({
						message: "Notification Deleted"
					});
				})
				.catch((err) => {
					emails.errorEmail(req, err);
					res.status(500).send({
						message: err.message || "Some error occurred."
					});
				});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
