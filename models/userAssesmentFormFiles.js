"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"userAssesmentFormFiles",
		{
			fileType: DataTypes.STRING,
			fileName: DataTypes.STRING,
			filePath: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = (models) => {
		table.belongsTo(models.userAssesmentForm);
	};
	return table;
};
