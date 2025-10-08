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
				{ title: "User", createdAt: date, updatedAt: date },
				{ title: "Subadmin", createdAt: date, updatedAt: date }
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
					isPayment: "Y",

					createdAt: date,
					updatedAt: date
				}
			],
			{}
		);

		await queryInterface.bulkInsert("userProfiles", [{ userId: "1", createdAt: date, updatedAt: date }], {});

		await queryInterface.bulkInsert(
			"categories",
			[
				{
					title: "Breakfast",
					createdAt: date,
					updatedAt: date
				},
				{
					title: "Lunch",
					createdAt: date,
					updatedAt: date
				},
				{
					title: "Dinner",
					createdAt: date,
					updatedAt: date
				},
				{
					title: "Snacks",
					createdAt: date,
					updatedAt: date
				}
			],
			{}
		);
	},

	async down(queryInterface, Sequelize) {}
};
