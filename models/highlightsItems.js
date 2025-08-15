module.exports = (sequelize, DataTypes) => {
	const table = sequelize.define(
		"highlightItems",
		{
			mediaType: {
				type: DataTypes.ENUM("photo", "video"),
				allowNull: false
			},
			mediaUrl: {
				type: DataTypes.STRING, // URL to the media file
				allowNull: false
			},
			thumbnailUrl: {
				type: DataTypes.STRING // For video thumbnails
			},
			duration: {
				type: DataTypes.INTEGER // In seconds (for videos)
			},
			caption: {
				type: DataTypes.STRING
			},
			link: {
				type: DataTypes.STRING // Optional link attached to the story
			},
			viewedCount: {
				type: DataTypes.INTEGER,
				defaultValue: 0
			},
			isArchived: {
				type: DataTypes.BOOLEAN,
				defaultValue: false
			}
		},
		{ timestamps: true }
	);

	table.associate = (models) => {
		table.belongsTo(models.highlights);
		table.hasMany(models.highlightViews);
	};

	return table;
};
