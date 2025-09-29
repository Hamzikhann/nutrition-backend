"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"banners",

		{
			image: DataTypes.TEXT,
			link: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {};

	return table;
};
