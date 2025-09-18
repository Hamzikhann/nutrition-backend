"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"meals",
		{
			title: DataTypes.STRING,
			description: DataTypes.TEXT,
			image: DataTypes.STRING,
			kcalOptions: DataTypes.TEXT,
			planName: DataTypes.STRING,
			subCategory: DataTypes.STRING,
			ingredientsDetails: DataTypes.TEXT,
			cookingSteps: DataTypes.TEXT,
			nutritionCalories: DataTypes.STRING,
			nutritionProtein: DataTypes.STRING,
			nutritionCarbs: DataTypes.STRING,
			nutritionFat: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	// Remove associations as meals are standalone entities now
	table.associate = (models) => {
		table.hasMany(models.assignedMeals);
		table.hasMany(models.mealPlaner);
		table.belongsTo(models.mealTypes);
		table.belongsTo(models.dishesCategories);
		table.belongsTo(models.categories);
	};
	return table;
};
