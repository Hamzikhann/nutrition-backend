const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const Op = db.Sequelize.Op;

const Roles = db.roles;

exports.list = (req, res) => {
	try {
		Roles.findAll({
			where: {
				isActive: "Y",
				id: { [Op.ne]: 1 }
			},
			attributes: ["id", "title"]
		})
			.then((data) => {
				encryptHelper(data);
				res.send({
					message: "Roles list retrived",
					data
				});
			})
			.catch((err) => {
				emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while retrieving roles."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
