"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"paymentTypes",
		{
			paymentMethodName: DataTypes.STRING,
			paymentType: DataTypes.STRING,
			accountNumber: DataTypes.STRING,
			accountTitle: DataTypes.STRING,
			bankName: DataTypes.STRING,
			iban: DataTypes.STRING,
			swiftCode: DataTypes.STRING,
			paymentInstructions: DataTypes.TEXT,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.paymentTypesCategories);
	};

	return table;
};
