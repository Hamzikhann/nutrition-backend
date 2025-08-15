"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"userPrograms",
		{
			
			startDate: DataTypes.DATE,
			endDate: DataTypes.DATE
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.users);
		table.belongsTo(models.programs);
	};

	return table;
};
