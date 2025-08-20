const db = require("../../models");
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");

const Plans = db.plans;

exports.list = async (req, res) => {
	try {
		const plans = await Plans.findAll();
		encryptHelper(plans);

		res.json({
			success: true,
			data: plans
		});
	} catch (error) {
		res.json({
			success: false,
			message: error.message
		});
	}
};
