"use strict";
module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"userPlans",
		{
			duration: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.plans);
		table.belongsTo(models.users);
	};
	return table;
};
