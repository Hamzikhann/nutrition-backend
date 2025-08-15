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
					createdAt: date,
					updatedAt: date
				},

				{
					firstName: "Hamza",
					lastName: "Qasim",
					email: "hamza@gmail.com",
					password: "hamza123",
					roleId: "2",
					createdAt: date,
					updatedAt: date
				},
				{
					firstName: "Ali",
					lastName: "Khan",
					email: "ali@gmail.com",
					password: "ali123456",
					roleId: "2",
					createdAt: date,
					updatedAt: date
				}
			],
			{}
		);

		await queryInterface.bulkInsert("userProfiles", [{ userId: "1", createdAt: date, updatedAt: date }], {});
		await queryInterface.bulkInsert("userProfiles", [{ userId: "2", createdAt: date, updatedAt: date }], {});
		await queryInterface.bulkInsert("userProfiles", [{ userId: "3", createdAt: date, updatedAt: date }], {});
	},

	async down(queryInterface, Sequelize) {}
};
