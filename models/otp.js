"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"otp",
		{
			otp: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	return table;
};
