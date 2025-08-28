"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"workoutDayExercises",
		{
			sets: DataTypes.INTEGER,
			reps: DataTypes.INTEGER,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.workoutDays);
		table.belongsTo(models.exercises);
	};

	return table;
};
