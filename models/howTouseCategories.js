"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"howTouseCategories",

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
		table.hasMany(models.howTouses);
	};

	return table;
};
