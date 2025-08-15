"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"weeks",
		{
			title: DataTypes.STRING,
			order: DataTypes.INTEGER
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.programs);
		table.hasMany(models.workoutDays);
		table.hasMany(models.workoutDayExercises);
	};

	return table;
};
