"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"dishesCategories",
		{
			title: {
				type: DataTypes.STRING
			},
			image: {
				type: DataTypes.STRING
			},
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = (models) => {
		table.hasMany(models.dishes);
		table.hasMany(models.meals);
		table.belongsTo(models.mealTypes);
		table.belongsTo(models.categories);
	};

	return table;
};
