"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"highlights",
		{
			title: {
				type: DataTypes.STRING
			},
			coverImage: {
				type: DataTypes.STRING // URL to the cover image
			},
			isArchived: {
				type: DataTypes.BOOLEAN,
				defaultValue: false
			},
			isActive: {
				type: DataTypes.STRING,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);

	table.associate = (models) => {
		table.belongsTo(models.users);
		table.hasMany(models.highlightItems);
	};

	return table;
};
