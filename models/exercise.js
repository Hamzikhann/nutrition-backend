"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"exercises",
		{
			name: DataTypes.STRING,
			description: DataTypes.TEXT,
			videoURL: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.workoutDays);
		table.hasMany(models.workoutDayExercises);
	};

	return table;
};
