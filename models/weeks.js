"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"weeks",
		{
			title: DataTypes.STRING,
			order: DataTypes.INTEGER,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.plans);

		table.hasMany(models.workoutDays);
		table.hasMany(models.workoutDayExercises);
	};

	return table;
};
