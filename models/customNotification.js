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
			sentCount: {
				type: DataTypes.INTEGER,
				defaultValue: 0
			},
			failedCount: {
				type: DataTypes.INTEGER,
				defaultValue: 0
			},
			totalUsers: {
				type: DataTypes.INTEGER,
				defaultValue: 0
			},
			successfulUsers: {
				type: DataTypes.JSON,
				defaultValue: []
			},
			failedUsers: {
				type: DataTypes.JSON,
				defaultValue: []
			},
			deliveryStats: {
				type: DataTypes.JSON,
				defaultValue: {}
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
		table.belongsTo(models.notificationCategoriesFolder);
	};
	return table;
};
