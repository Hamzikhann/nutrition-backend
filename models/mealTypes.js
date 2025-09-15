"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"mealTypes",
		{
			title: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.hasMany(models.dishesCategories);

		// meals no longer has dishes association
	};

	return table;
};
