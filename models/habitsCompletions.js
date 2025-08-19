"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"habitsCompletions",
		{
			status: DataTypes.STRING,

			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.habits);
		table.belongsTo(models.users);
	};
	return table;
};
