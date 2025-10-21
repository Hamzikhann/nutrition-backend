"use strict";

module.exports = (sequelize, DataTypes) => {
	const Progress = sequelize.define(
		"userAssesmentProgress",
		{
			// === Basic Weights ===
			currentWeight: {
				type: DataTypes.FLOAT,
				allowNull: true,
				comment: "Q: Your Current Weight?"
			},
			goalWeight: {
				type: DataTypes.FLOAT,
				allowNull: true,
				comment: "Q: Your Goal Weight?"
			},

			// === Problems / Feedback ===
			problemsFaced: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: What problems are you facing right now? (Day 11 onwards)"
			},
			problemsResolved: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: What problems have been resolved by joining 100 Days Coaching?"
			},
			dietWorkoutProblems: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: What problems are you facing in the diet/workout section?"
			},

			// === Positive Changes / Habits ===
			positiveChanges: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: What 3 Positive Changes have you felt in body in 15 days?"
			},
			habitsIncluded: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: What habits are part of your routine/life now?"
			},
			habitsDifficult: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: What habits are difficult to include and why?"
			},

			// === App / Experience Feedback ===
			appFeedback: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: Are you enjoying the app? Is it keeping you on track?"
			},
			suggestions: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: Any suggestions for app features?"
			},
			likedFeatures: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: Which feature did you like the most?"
			},
			coachReview: {
				type: DataTypes.TEXT,
				allowNull: true,
				comment: "Q: Your reviews about the coach and coaching?"
			},

			// === Period Tracking ===
			periodDetails: {
				type: DataTypes.STRING,
				allowNull: true,
				comment: "Q: Last 3 period dates + mention if natural or with pills (string or JSON)"
			},

			// === Meta ===
			dayNumber: {
				type: DataTypes.INTEGER,
				allowNull: false,
				comment: "Represents the day milestone (e.g., 11, 25, 40, 55, 70, 85, 100)"
			}
		},
		{ timestamps: true }
	);

	Progress.associate = function (models) {
		Progress.belongsTo(models.users);

		Progress.hasMany(models.measurements);
	};

	return Progress;
};
