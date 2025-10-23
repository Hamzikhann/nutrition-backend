"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"notificationCategoriesFolder",
		{
			name: {
				type: DataTypes.STRING,
				allowNull: false
			},
			users: {
				type: DataTypes.TEXT, // JSON string of selected categories
				allowNull: false
			},
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			},
			isdeleted: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "N"
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.hasMany(models.customNotification);
	};
	return table;
};
