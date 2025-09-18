"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"mealPlaner",
		{
			title: DataTypes.STRING,
			day: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	// Remove associations as meals are standalone entities now
	table.associate = (models) => {
		table.belongsTo(models.meals);
		table.belongsTo(models.categories);
		table.belongsTo(models.users);
	};
	return table;
};
