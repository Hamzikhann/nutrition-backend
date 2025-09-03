"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"communityCategories",

		{
			title: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		// If you have an Admin/User model, link here
		table.hasMany(models.communityPosts);
	};

	return table;
};
