"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"payments",
		{
			amount: DataTypes.INTEGER,
			currency: DataTypes.STRING,
			payment_method: DataTypes.STRING,
			status: DataTypes.STRING,
			paymentIntentId: DataTypes.STRING,
			file: DataTypes.STRING
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.users);
	};
	return table;
};
