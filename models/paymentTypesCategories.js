"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"paymentTypesCategories",
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
		table.hasMany(models.paymentTypes);
	};

	return table;
};
