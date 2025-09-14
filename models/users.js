"use strict";

module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"users",
		{
			firstName: DataTypes.STRING,
			lastName: DataTypes.STRING,
			phoneNo: DataTypes.STRING,
			email: DataTypes.STRING,
			isFormCreated: {
				type: DataTypes.STRING,
				defaultValue: "N"
			},
			password: DataTypes.STRING,
			imageURL: DataTypes.STRING,
			fcmToken: DataTypes.TEXT,
			isPaid: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "N"
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
		table.belongsTo(models.roles);
		table.hasOne(models.userProfile);
		table.hasMany(models.notifications);
		table.hasMany(models.habits);
		table.hasMany(models.highlights);
		table.hasMany(models.highlightViews);
		table.hasOne(models.userAssesmentForm);
		table.hasOne(models.payments);
		table.hasMany(models.userPlans);
		table.hasMany(models.habitsCompletions);
	};
	return table;
};
/*
module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"users",
		{
			firstName: {
				type: DataTypes.STRING,
				allowNull: false
			},
			lastName: {
				type: DataTypes.STRING,
				allowNull: false
			},
			phoneNo: {
				type: DataTypes.STRING,
				unique: true,
				allowNull: false
			},
			email: {
				type: DataTypes.STRING,
				unique: true,
				allowNull: false,
				validate: {
					isEmail: true
				}
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false
			},
			imageURL: DataTypes.STRING,
			fcmToken: DataTypes.TEXT,
			isActive: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true
			}
		},
		{ timestamps: true }
	);
	table.associate = function (models) {
		table.belongsTo(models.roles);
		table.hasOne(models.userProfile);
		table.hasMany(models.notifications);
	};
	return table;
};
*/
