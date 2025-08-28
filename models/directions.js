"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"directions",
		{
			stepNumber: DataTypes.INTEGER,
			description: DataTypes.TEXT,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.meals);
		table.belongsTo(models.dishes);
	};

	return table;
};
