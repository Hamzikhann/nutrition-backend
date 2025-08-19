"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"plans",
		{
			name: DataTypes.STRING,
			price: DataTypes.STRING,
			duration: DataTypes.STRING,
			features: DataTypes.TEXT,
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
