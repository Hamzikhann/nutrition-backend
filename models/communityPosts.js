"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"communityPosts",
		{
			title: DataTypes.STRING,
			content: DataTypes.TEXT,
			image: DataTypes.STRING, // optional, for post images
			access: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = function (models) {
		// If you have an Admin/User model, link here
		table.belongsTo(models.users);
		table.belongsTo(models.communityCategories);
		table.hasMany(models.communityComments);
		table.hasMany(models.communityLikes);
		table.hasMany(models.communitylikesCounter);
		table.hasMany(models.communityPostMedia);
	};

	return table;
};
