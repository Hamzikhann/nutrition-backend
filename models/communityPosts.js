"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"communityPosts",
		{
			title: DataTypes.STRING,
			content: DataTypes.TEXT,
			image: DataTypes.STRING // optional, for post images
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		// If you have an Admin/User model, link here
		table.belongsTo(models.users);
		table.hasMany(models.communityComments);
		table.hasMany(models.communityLikes);
	};

	return table;
};
