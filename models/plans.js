"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"plans",
		{
			name: DataTypes.STRING,
			price: DataTypes.STRING,
			duration: DataTypes.STRING,
			details: DataTypes.TEXT,
			isFree: { type: DataTypes.STRING, defaultValue: "N", allowNull: false },

			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.hasMany(models.userPlans);
	};
	return table;
};
