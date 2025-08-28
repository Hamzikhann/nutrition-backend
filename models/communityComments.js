"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"communityComments",
		{
			comment: DataTypes.TEXT,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		table.belongsTo(models.communityPosts);
		table.belongsTo(models.users);
	};

	return table;
};
