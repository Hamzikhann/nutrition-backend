"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"dishes",
		{
			title: DataTypes.STRING,
			description: DataTypes.TEXT,
			image: DataTypes.STRING
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.meals);
		table.hasMany(models.ingredients);
		table.hasMany(models.nutrition);
		table.hasMany(models.directions);
	};

	return table;
};
