"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"ingredients",
		{
			name: DataTypes.STRING,
			quantity: DataTypes.STRING
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.meals,);
		table.belongsTo(models.dishes);
	};

	return table;
};
