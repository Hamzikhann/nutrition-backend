"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"categories",

		{
			title: DataTypes.TEXT,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.hasMany(models.dishesCategories);
	};

	return table;
};
