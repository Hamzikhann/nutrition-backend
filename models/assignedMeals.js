"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"assignedMeals",
		{
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false
			},
			mealId: {
				type: DataTypes.INTEGER,
				allowNull: false
			},
			assessmentId: {
				type: DataTypes.INTEGER,
				allowNull: false
			},
			mealTypeId: {
				type: DataTypes.INTEGER,
				allowNull: false
			},
			calculatedKcal: {
				type: DataTypes.INTEGER,
				allowNull: false
			},
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.users, { foreignKey: "userId" });
		table.belongsTo(models.meals, { foreignKey: "mealId" });
		table.belongsTo(models.userAssesmentForm, { foreignKey: "assessmentId" });
		table.belongsTo(models.mealTypes, { foreignKey: "mealTypeId" });
	};

	return table;
};
