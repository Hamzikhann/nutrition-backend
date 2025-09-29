"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"assignedSupplements",
		{
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.users);
		table.belongsTo(models.supplementsCategories);
	};

	return table;
};
