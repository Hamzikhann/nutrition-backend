"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"dishesCategories",
		{
			title: {
				type: DataTypes.STRING
			},
			image: {
				type: DataTypes.STRING
			},
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = (models) => {
		table.hasMany(models.dishes);
	};

	return table;
};
