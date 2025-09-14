"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"dishes",
		{
			title: DataTypes.STRING,
			description: DataTypes.TEXT,
			image: DataTypes.STRING,
			ingredients: DataTypes.TEXT,
			directions: DataTypes.TEXT,
			nutritions: DataTypes.TEXT,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.meals);
		table.hasOne(models.nutrition);
		table.hasOne(models.directions);
		// table.hasMany(models.assignedIngredients);
		table.belongsTo(models.dishesCategories);
	};

	return table;
};
