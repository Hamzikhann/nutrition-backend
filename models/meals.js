"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"meals",
		{
			title: DataTypes.STRING,
			description: DataTypes.TEXT,
			image: DataTypes.STRING
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.hasMany(models.dishes);
		table.hasMany(models.ingredients);
		table.hasMany(models.nutrition);
		table.hasMany(models.directions);
	};

	return table;
};
