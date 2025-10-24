"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"notifications",
		{
			title: DataTypes.STRING,
			body: DataTypes.TEXT,
			isRead: {
				type: DataTypes.BOOLEAN,
				defaultValue: false
			},
			type: DataTypes.STRING,
			data: {
				type: DataTypes.TEXT,
				defaultValue: {}
			},
			readAt: DataTypes.DATE,
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
		table.belongsTo(models.users);
	};
	return table;
};
