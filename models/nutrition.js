"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"nutrition",
		{
			calories: DataTypes.FLOAT,
			protein: DataTypes.FLOAT,
			carbs: DataTypes.FLOAT,
			fats: DataTypes.FLOAT
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.meals );
		table.belongsTo(models.dishes);
	};

	return table;
};
