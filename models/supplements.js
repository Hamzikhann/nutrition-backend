"use strict";

const { description } = require("@hapi/joi/lib/base");

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"supplements",
		{
			title: DataTypes.STRING,
			description: DataTypes.STRING,
			image: DataTypes.STRING,
			externalLink: DataTypes.STRING,
			dosage: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.supplementsCategories);
	};
	return table;
};
