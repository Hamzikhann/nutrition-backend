"use strict";

module.exports = (sequelize, DataTypes) => {
	const Measurements = sequelize.define(
		"measurements",
		{
			// === Day 1 Measurements ===
			day1Chest: DataTypes.FLOAT,
			day1RightArm: DataTypes.FLOAT,
			day1LeftArm: DataTypes.FLOAT,
			day1BellyButton: DataTypes.FLOAT,
			day1Waist: DataTypes.FLOAT,
			day1Hips: DataTypes.FLOAT,
			day1LeftThigh: DataTypes.FLOAT,
			day1RightThigh: DataTypes.FLOAT,
			day1Wrist: DataTypes.FLOAT,

			// === Current / Updated Measurements ===
			currentChest: DataTypes.FLOAT,
			currentRightArm: DataTypes.FLOAT,
			currentLeftArm: DataTypes.FLOAT,
			currentBellyButton: DataTypes.FLOAT,
			currentWaist: DataTypes.FLOAT,
			currentHips: DataTypes.FLOAT,
			currentLeftThigh: DataTypes.FLOAT,
			currentRightThigh: DataTypes.FLOAT,
			currentWrist: DataTypes.FLOAT
		},
		{ timestamps: true }
	);

	Measurements.associate = function (models) {
		Measurements.belongsTo(models.userAssesmentProgress);
	};

	return Measurements;
};
