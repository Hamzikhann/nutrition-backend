"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"dishes",
		{
			title: DataTypes.STRING,
			description: DataTypes.TEXT,
			image: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.meals);
		table.hasMany(models.nutrition);
		table.hasMany(models.directions);
		table.hasMany(models.assignedIngredients);
		table.belongsTo(models.dishesCategories);
	};

	return table;
};
