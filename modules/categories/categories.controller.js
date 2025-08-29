const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");

const Categories = db.categories;

exports.list = async (req, res) => {
	try {
		const categories = await Categories.findAll({
			where: {
				isActive: "Y"
			}
		});
		encryptHelper(categories);

		return res.status(200).send({
			message: "Categories list",
			data: categories
		});
	} catch (error) {
		res.status(500).send({
			message: "Internal server error",
			error: error.message
		});
	}
};
