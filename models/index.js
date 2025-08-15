"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};

// Initialize Sequelize
let sequelize;
if (config.use_env_variable) {
	sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
	sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Load Sequelize models
fs.readdirSync(__dirname)
	.filter((file) => {
		return (
			file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js" && file.indexOf(".mongo.") === -1 // Skip Mongoose models
		);
	})
	.forEach((file) => {
		const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
		db[model.name] = model;
	});

Object.keys(db).forEach((modelName) => {
	if (db[modelName].associate) {
		db[modelName].associate(db);
	}
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// MongoDB Connection and Models
const connectMongoDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
		console.log("✅ MongoDB connected successfully.");

		// Load Mongoose models AFTER connection is established
		fs.readdirSync(__dirname)
			.filter((file) => file.endsWith(".mongo.js")) // Convention: mongoose models end with .mongo.js
			.forEach((file) => {
				const model = require(path.join(__dirname, file))(mongoose);
				db[model.modelName] = model;
			});
	} catch (error) {
		console.error("❌ MongoDB connection failed:", error);
		process.exit(1);
	}
};

db.mongoose = mongoose;
db.connectMongoDB = connectMongoDB;

module.exports = db;
