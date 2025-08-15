"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"workoutDays",
		{
			dayNumber: DataTypes.INTEGER,
			title: DataTypes.STRING
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.weeks);
		table.hasMany(models.exercises);
		table.hasMany(models.workoutDayExercises);
	};

	return table;
};
