"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"exercises",
		{
			name: DataTypes.STRING,
			description: DataTypes.TEXT,
			videoURL: DataTypes.STRING
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.workoutDays);
		table.hasMany(models.workoutDayExercises);
    };

	return table;
};
