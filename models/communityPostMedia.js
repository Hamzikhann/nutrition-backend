"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"communityPostMedia",
		{
			media: DataTypes.STRING,
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{
			timestamps: true
		}
	);

	table.associate = function (models) {
		table.belongsTo(models.communityPosts);
	};

	return table;
};
