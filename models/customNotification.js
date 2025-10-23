"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"customNotification",
		{
			title: {
				type: DataTypes.STRING,
				allowNull: false
			},
			content: {
				type: DataTypes.TEXT,
				allowNull: false
			},

			status: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Pending"
			},
			scheduledAt: DataTypes.DATE,
			sentAt: DataTypes.DATE,
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
		table.belongsTo(models.notificationCategoriesFolder);
	};
	return table;
};
