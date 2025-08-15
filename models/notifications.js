"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"notifications",
		{
			title: DataTypes.STRING,
			body: DataTypes.STRING,
			isRead: DataTypes.BOOLEAN,
			type: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.users);
	};
	return table;
};
