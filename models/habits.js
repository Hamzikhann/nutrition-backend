"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"habits",
		{
			name: {
				type: DataTypes.STRING,
				allowNull: false
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true
			},
			status: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Pending"
			},
			mandatory: {
				type: DataTypes.STRING,
				allowNull: false
			},
			createdBy: {
				type: DataTypes.STRING,
				allowNull: false
			},

			isActive: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "Y"
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		// table.hasMany(models.userHabits);
		table.belongsTo(models.users);
	};
	return table;
};
