"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"communitylikesCounter",
		{
			reactionType: {
				type: DataTypes.ENUM("love"),
				allowNull: false,
				defaultValue: "love"
			},
			count: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0
			}
		},
		{
			timestamps: true,
			indexes: [
				// one row per (post, type):
				{ unique: true, fields: ["communityPostId", "reactionType"] },
				{ fields: ["communityPostId"] }
			]
		}
	);

	table.associate = (models) => {
		table.belongsTo(models.communityPosts);
		table.hasOne(models.communityLikes);
	};

	return table;
};
