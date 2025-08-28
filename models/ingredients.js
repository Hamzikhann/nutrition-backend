"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"ingredients",
		{
			name: DataTypes.STRING,
			quantity: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.hasMany(models.assignedIngredients);
	};

	return table;
};
