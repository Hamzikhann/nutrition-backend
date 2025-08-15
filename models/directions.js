"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"directions",
		{
			stepNumber: DataTypes.INTEGER,
			description: DataTypes.TEXT
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.meals);
		table.belongsTo(models.dishes);
	};

	return table;
};
