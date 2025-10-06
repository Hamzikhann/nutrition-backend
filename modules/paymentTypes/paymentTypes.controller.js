const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const Joi = require("joi");
const crypto = require("../../utils/crypto");
const { CatalogItem } = require("twilio/lib/rest/content/v1/content");

const PaymentTypes = db.paymentTypes;
const PaymentTypesCategories = db.paymentTypesCategories;

exports.create = async (req, res) => {
	try {
		const schema = Joi.object({
			name: Joi.string().required(),
			type: Joi.string().required(),
			accountNumber: Joi.string().required(),
			accountTitle: Joi.string().required(),
			bankName: Joi.string().optional().allow("").allow(null),
			iban: Joi.string().optional().allow("").allow(null),
			swiftCode: Joi.string().optional().allow("").allow(null),
			isActive: Joi.boolean().optional().allow("").allow(null),
			instructions: Joi.string().optional().allow("").allow(null),
			category: Joi.string().optional().allow("").allow(null)
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		let paymentMethodName = req.body.name;
		let paymentType = req.body.type;
		let accountNumber = req.body.accountNumber;
		let accountTitle = req.body.accountTitle;
		let bankName = req.body.bankName;
		let iban = req.body.iban;
		let swiftCode = req.body.swiftCode;
		let paymentInstructions = req.body.instructions;

		let category = req.body.category;

		const createpaymentType = await PaymentTypes.create({
			paymentMethodName: paymentMethodName,
			paymentType: paymentType,
			accountNumber: accountNumber,
			accountTitle: accountTitle,
			bankName: bankName,
			iban: iban,
			swiftCode: swiftCode,
			paymentInstructions: paymentInstructions,
			paymentTypesCategoryId: crypto.decrypt(category) //category
		});
		encryptHelper(createpaymentType);

		return res.status(200).send({
			message: "Payment type created successfully",
			data: createpaymentType
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while creating the payment type."
		});
	}
};

exports.list = async (req, res) => {
	try {
		if (req.role == "Administrator" || req.role == "Subadmin") {
			const paymentTypes = await PaymentTypes.findAll({
				where: {
					isActive: "Y"
				},
				include: [
					{
						model: PaymentTypesCategories
					}
				]
			});
			encryptHelper(paymentTypes);

			return res.status(200).send({
				message: "Payment types list",
				data: paymentTypes
			});
		} else {
			const paymentTypes = await PaymentTypesCategories.findAll({
				where: {
					isActive: "Y"
				},
				include: [
					{
						model: PaymentTypes,
						where: {
							isActive: "Y"
						}
					}
				]
			});
			encryptHelper(paymentTypes);

			return res.status(200).send({
				message: "Payment types list",
				data: paymentTypes
			});
		}
	} catch (error) {
		res.status(500).send({
			message: "Internal server error",
			error: error.message
		});
	}
};

exports.detail = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required()
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({ message: error.details[0].message });
		}

		const paymentType = await PaymentTypes.findOne({
			where: {
				id: crypto.decrypt(value.id),
				isActive: "Y"
			}
		});

		if (!paymentType) {
			return res.status(404).send({
				message: "Payment type not found"
			});
		}

		encryptHelper(paymentType);

		return res.status(200).send({
			message: "Payment type details",
			data: paymentType
		});
	} catch (error) {
		res.status(500).send({
			message: "Internal server error",
			error: error.message
		});
	}
};

exports.update = async (req, res) => {
	try {
		const schema = Joi.object({
			id: Joi.string().required(),
			name: Joi.string().required(),
			type: Joi.string().required(),
			accountNumber: Joi.string().required(),
			accountTitle: Joi.string().required(),
			bankName: Joi.string().optional(),
			iban: Joi.string().optional().allow("").allow(null),
			swiftCode: Joi.string().optional().allow("").allow(null),
			isActive: Joi.boolean().optional().allow("").allow(null),
			instructions: Joi.string().optional().allow("").allow(null),
			category: Joi.string().optional().allow("").allow(null)
		});

		const { error, value } = schema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const { id, name, type, accountNumber, accountTitle, bankName, iban, swiftCode, isActive, instructions, category } =
			value;

		const [updated] = await PaymentTypes.update(
			{
				name,
				type,
				accountNumber,
				accountTitle,
				bankName,
				iban,
				swiftCode,
				paymentInstructions: instructions,
				paymentTypesCategoryId: crypto.decrypt(category)
			},
			{
				where: { id: crypto.decrypt(id) }
			}
		);

		if (updated === 0) {
			return res.status(404).send({
				message: "Payment type not found or no changes made"
			});
		}

		const updatedPaymentType = await PaymentTypes.findOne({
			where: { id: crypto.decrypt(id) }
		});

		encryptHelper(updatedPaymentType);

		return res.status(200).send({
			message: "Payment type updated successfully",
			data: updatedPaymentType
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while updating the payment type."
		});
	}
};

exports.delete = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			id: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		}

		const paymentTypeId = crypto.decrypt(value.id);
		const [updated] = await PaymentTypes.update(
			{
				isActive: "N"
			},
			{
				where: {
					id: paymentTypeId
				}
			}
		);

		if (updated === 0) {
			return res.status(404).send({
				message: "Payment type not found"
			});
		}

		return res.status(200).send({
			message: "Payment type deleted successfully"
		});
	} catch (err) {
		console.log(err);
		res.status(500).send({
			message: err.message || "Some error occurred while deleting the payment type."
		});
	}
};
