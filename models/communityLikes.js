"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define("communityLikes", {}, { timestamps: true });

	table.associate = function (models) {
		table.belongsTo(models.communityPosts);
		table.belongsTo(models.users);
	};

	return table;
};
