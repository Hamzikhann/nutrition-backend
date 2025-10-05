// "use strict";

// module.exports = (sequelize, DataTypes) => {
// 	const table = sequelize.define("communityLikes", {}, { timestamps: true });

// 	table.associate = function (models) {
// 		table.belongsTo(models.communityPosts);
// 		table.belongsTo(models.users);
// 	};

// 	return table;
// };

"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"communityLikes",
		{
			reactionType: {
				type: DataTypes.ENUM("love"),
				allowNull: false,
				defaultValue: "love"
			}
		},
		{
			timestamps: true,
			indexes: [
				{ fields: ["communityPostId"] },
				{ fields: ["reactionType"] },
				// one reaction per user per post:
				{ unique: true, fields: ["communityPostId", "userId"] }
			]
		}
	);

	table.associate = function (models) {
		table.belongsTo(models.communityPosts);
		table.belongsTo(models.users);
		table.hasOne(models.communitylikesCounter);
	};

	return table;
};
