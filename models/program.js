"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"programs",
		{
			title: DataTypes.STRING,
			description: DataTypes.TEXT,
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.users);
		table.hasMany(models.weeks);
		table.hasMany(models.userPrograms);
        table.hasMany(models.weeks);
    };

	return table;
};
