"use strict";

const { description } = require("@hapi/joi/lib/base");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const date = new Date();

		await queryInterface.bulkInsert(
			"roles",
			[
				{ title: "Administrator", createdAt: date, updatedAt: date },
				{ title: "User", createdAt: date, updatedAt: date }
			],
			{}
		);

		await queryInterface.bulkInsert(
			"users",
			[
				{
					firstName: "Admin",
					lastName: "Account",
					email: "admin@gmail.com",
					password: "admin123",
					roleId: "1",
					isPaid: "Y",

					createdAt: date,
					updatedAt: date
				},

				{
					firstName: "Hamza",
					lastName: "Qasim",
					email: "hamza@gmail.com",
					password: "hamza123",
					roleId: "2",
					isPaid: "Y",

					createdAt: date,
					updatedAt: date
				},
				{
					firstName: "Ali",
					lastName: "Khan",
					email: "ali@gmail.com",
					password: "ali123456",
					roleId: "2",
					isPaid: "N",

					createdAt: date,
					updatedAt: date
				}
			],
			{}
		);

		await queryInterface.bulkInsert("userProfiles", [{ userId: "1", createdAt: date, updatedAt: date }], {});
		await queryInterface.bulkInsert("userProfiles", [{ userId: "2", createdAt: date, updatedAt: date }], {});
		await queryInterface.bulkInsert("userProfiles", [{ userId: "3", createdAt: date, updatedAt: date }], {});

		await queryInterface.bulkInsert(
			"plans",
			[
				{
					name: "Free",
					price: "0",
					duration: "3 days",
					features: "Basic features",
					createdAt: date,
					updatedAt: date
				},
				{
					name: "Standard",
					price: "99",
					duration: "4 months",
					features: "Standard features",
					createdAt: date,
					updatedAt: date
				},
				{
					name: "Premium",
					price: "199",
					duration: "6 months",
					features: "Premium features",
					createdAt: date,
					updatedAt: date
				}
			],
			{}
		);

		await queryInterface.bulkInsert(
			"programs",
			[
				{
					title: "Free",
					description: "Free Program",
					createdAt: date,
					updatedAt: date
				},
				{
					title: "Standard",
					description: "Standard Program",
					createdAt: date,
					updatedAt: date
				},
				{
					title: "Premium",
					description: "Premium Program",
					createdAt: date,
					updatedAt: date
				}
			],
			{}
		);

		await queryInterface.bulkInsert(
			"userPrograms",
			[
				{
					userId: 2,
					programId: 2,
					startDate: date,
					endDate: date,
					createdAt: date,
					updatedAt: date
				},

				{
					userId: "3",
					programId: "3",
					startDate: date,
					endDate: date,
					createdAt: date,
					updatedAt: date
				}
			],
			{}
		);

		await queryInterface.bulkInsert(
			"weeks",
			[
				{
					programId: 2,
					title: "Week 1",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 2",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 3",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 4",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 5",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 6",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 7",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 8",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 9",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 10",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 11",
					createdAt: date,
					updatedAt: date
				},
				{
					programId: 2,
					title: "Week 12",
					createdAt: date,
					updatedAt: date
				}
			],

			{}
		);

		await queryInterface.bulkInsert(
			"workoutDays",
			[
				// Week 1
				{ weekId: 1, title: "Workout Day 1", dayNumber: 1, createdAt: date, updatedAt: date },
				{ weekId: 1, title: "Workout Day 2", dayNumber: 2, createdAt: date, updatedAt: date },
				{ weekId: 1, title: "Workout Day 3", dayNumber: 3, createdAt: date, updatedAt: date },
				{ weekId: 1, title: "Workout Day 4", dayNumber: 4, createdAt: date, updatedAt: date },
				{ weekId: 1, title: "Workout Day 5", dayNumber: 5, createdAt: date, updatedAt: date },

				// Week 2
				{ weekId: 2, title: "Workout Day 1", dayNumber: 6, createdAt: date, updatedAt: date },
				{ weekId: 2, title: "Workout Day 2", dayNumber: 7, createdAt: date, updatedAt: date },
				{ weekId: 2, title: "Workout Day 3", dayNumber: 8, createdAt: date, updatedAt: date },
				{ weekId: 2, title: "Workout Day 4", dayNumber: 9, createdAt: date, updatedAt: date },
				{ weekId: 2, title: "Workout Day 5", dayNumber: 10, createdAt: date, updatedAt: date },

				// Week 3
				{ weekId: 3, title: "Workout Day 1", dayNumber: 11, createdAt: date, updatedAt: date },
				{ weekId: 3, title: "Workout Day 2", dayNumber: 12, createdAt: date, updatedAt: date },
				{ weekId: 3, title: "Workout Day 3", dayNumber: 13, createdAt: date, updatedAt: date },
				{ weekId: 3, title: "Workout Day 4", dayNumber: 14, createdAt: date, updatedAt: date },
				{ weekId: 3, title: "Workout Day 5", dayNumber: 15, createdAt: date, updatedAt: date },

				// Week 4
				{ weekId: 4, title: "Workout Day 1", dayNumber: 16, createdAt: date, updatedAt: date },
				{ weekId: 4, title: "Workout Day 2", dayNumber: 17, createdAt: date, updatedAt: date },
				{ weekId: 4, title: "Workout Day 3", dayNumber: 18, createdAt: date, updatedAt: date },
				{ weekId: 4, title: "Workout Day 4", dayNumber: 19, createdAt: date, updatedAt: date },
				{ weekId: 4, title: "Workout Day 5", dayNumber: 20, createdAt: date, updatedAt: date },

				// Week 5
				{ weekId: 5, title: "Workout Day 1", dayNumber: 21, createdAt: date, updatedAt: date },
				{ weekId: 5, title: "Workout Day 2", dayNumber: 22, createdAt: date, updatedAt: date },
				{ weekId: 5, title: "Workout Day 3", dayNumber: 23, createdAt: date, updatedAt: date },
				{ weekId: 5, title: "Workout Day 4", dayNumber: 24, createdAt: date, updatedAt: date },
				{ weekId: 5, title: "Workout Day 5", dayNumber: 25, createdAt: date, updatedAt: date },

				// Week 6
				{ weekId: 6, title: "Workout Day 1", dayNumber: 26, createdAt: date, updatedAt: date },
				{ weekId: 6, title: "Workout Day 2", dayNumber: 27, createdAt: date, updatedAt: date },
				{ weekId: 6, title: "Workout Day 3", dayNumber: 28, createdAt: date, updatedAt: date },
				{ weekId: 6, title: "Workout Day 4", dayNumber: 29, createdAt: date, updatedAt: date },
				{ weekId: 6, title: "Workout Day 5", dayNumber: 30, createdAt: date, updatedAt: date },

				// Week 7
				{ weekId: 7, title: "Workout Day 1", dayNumber: 31, createdAt: date, updatedAt: date },
				{ weekId: 7, title: "Workout Day 2", dayNumber: 32, createdAt: date, updatedAt: date },
				{ weekId: 7, title: "Workout Day 3", dayNumber: 33, createdAt: date, updatedAt: date },
				{ weekId: 7, title: "Workout Day 4", dayNumber: 34, createdAt: date, updatedAt: date },
				{ weekId: 7, title: "Workout Day 5", dayNumber: 35, createdAt: date, updatedAt: date },

				// Week 8
				{ weekId: 8, title: "Workout Day 1", dayNumber: 36, createdAt: date, updatedAt: date },
				{ weekId: 8, title: "Workout Day 2", dayNumber: 37, createdAt: date, updatedAt: date },
				{ weekId: 8, title: "Workout Day 3", dayNumber: 38, createdAt: date, updatedAt: date },
				{ weekId: 8, title: "Workout Day 4", dayNumber: 39, createdAt: date, updatedAt: date },
				{ weekId: 8, title: "Workout Day 5", dayNumber: 40, createdAt: date, updatedAt: date },

				// Week 9
				{ weekId: 9, title: "Workout Day 1", dayNumber: 41, createdAt: date, updatedAt: date },
				{ weekId: 9, title: "Workout Day 2", dayNumber: 42, createdAt: date, updatedAt: date },
				{ weekId: 9, title: "Workout Day 3", dayNumber: 43, createdAt: date, updatedAt: date },
				{ weekId: 9, title: "Workout Day 4", dayNumber: 44, createdAt: date, updatedAt: date },
				{ weekId: 9, title: "Workout Day 5", dayNumber: 45, createdAt: date, updatedAt: date },

				// Week 10
				{ weekId: 10, title: "Workout Day 1", dayNumber: 46, createdAt: date, updatedAt: date },
				{ weekId: 10, title: "Workout Day 2", dayNumber: 47, createdAt: date, updatedAt: date },
				{ weekId: 10, title: "Workout Day 3", dayNumber: 48, createdAt: date, updatedAt: date },
				{ weekId: 10, title: "Workout Day 4", dayNumber: 49, createdAt: date, updatedAt: date },
				{ weekId: 10, title: "Workout Day 5", dayNumber: 50, createdAt: date, updatedAt: date },

				// Week 11
				{ weekId: 11, title: "Workout Day 1", dayNumber: 51, createdAt: date, updatedAt: date },
				{ weekId: 11, title: "Workout Day 2", dayNumber: 52, createdAt: date, updatedAt: date },
				{ weekId: 11, title: "Workout Day 3", dayNumber: 53, createdAt: date, updatedAt: date },
				{ weekId: 11, title: "Workout Day 4", dayNumber: 54, createdAt: date, updatedAt: date },
				{ weekId: 11, title: "Workout Day 5", dayNumber: 55, createdAt: date, updatedAt: date },

				// Week 12
				{ weekId: 12, title: "Workout Day 1", dayNumber: 56, createdAt: date, updatedAt: date },
				{ weekId: 12, title: "Workout Day 2", dayNumber: 57, createdAt: date, updatedAt: date },
				{ weekId: 12, title: "Workout Day 3", dayNumber: 58, createdAt: date, updatedAt: date },
				{ weekId: 12, title: "Workout Day 4", dayNumber: 59, createdAt: date, updatedAt: date },
				{ weekId: 12, title: "Workout Day 5", dayNumber: 60, createdAt: date, updatedAt: date }
			],
			{}
		);
	},

	async down(queryInterface, Sequelize) {}
};
