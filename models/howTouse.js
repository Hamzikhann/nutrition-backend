"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"howTouses",

		{
			title: DataTypes.TEXT,
			description: DataTypes.TEXT,
			media: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.howTouseCategories);
	};

	return table;
};
