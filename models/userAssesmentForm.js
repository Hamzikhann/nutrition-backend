"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"userAssesmentForm",
		{
			name: DataTypes.STRING,
			country: DataTypes.STRING,
			whatsAppContact: DataTypes.STRING,
			email: DataTypes.STRING,
			martialStatus: DataTypes.STRING,
			weight: DataTypes.STRING,
			height: DataTypes.STRING,
			age: DataTypes.STRING,
			physicalActivity: DataTypes.STRING,
			purpose: DataTypes.STRING,
			pocsDuration: DataTypes.STRING,
			pcosSymptoms: DataTypes.STRING,
			medicalHistory: DataTypes.TEXT,
			lastPeriods: DataTypes.TEXT,
			medicalConditions: DataTypes.TEXT,
			medicines: DataTypes.TEXT,
			ultrasoundHormonalTests: DataTypes.STRING,
			breakfastOptions: DataTypes.TEXT,
			lunchOptions: DataTypes.TEXT,
			dinnerOptions: DataTypes.TEXT,
			snacksOptions: DataTypes.TEXT,

			meals: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = (models) => {
		table.hasMany(models.userAssesmentFormFiles);
		table.belongsTo(models.users);
		table.hasMany(models.assignedMeals);
	};
	return table;
};
