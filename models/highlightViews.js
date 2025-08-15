module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define("highlightViews", {
		viewedAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW
		}
	});

	table.associate = (models) => {
		table.belongsTo(models.highlightItems);
		table.belongsTo(models.users);
	};

	return table;
};
