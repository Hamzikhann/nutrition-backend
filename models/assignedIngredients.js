"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"assignedIngredients",
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
	table.associate = (models) => {
		table.belongsTo(models.dishes);
		table.belongsTo(models.ingredients);
	};
	return table;
};
