const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const cron = require("node-cron");

const appConfig = require("./config/app");
const routes = require("./routes/routes");
const db = require("./models/index");
const cornJob = require("./utils/cornJob");
const { initSocket } = require("./utils/socketService");

const dateFormatter = require("./utils/dateFormatter");
// Initialize Firebase Admin SDK

class Server {
	constructor() {
		this.app = express();
		this.io = require("socket.io")();

		this.app.use((req, res, next) => {
			const forbiddenPatterns = /\.(env|yml|yaml|json|config|sql|git|htaccess|save|swp|lock|log)$/i;
			if (forbiddenPatterns.test(req.url)) {
				console.warn(`🚨 Blocked suspicious request: ${req.method} ${req.url}`);
				return res.sendStatus(403); // <- blocks access safely
			}
			next();
		});

		this.app.use(dateFormatter);

		db.sequelize
			.sync()
			.then(() => {
				console.log("Synced db.");
			})
			.catch((err) => {
				console.log("Failed to sync db: " + err);
			});

		// db.connectMongoDB();
	}

	appConfig() {
		new appConfig(this.app, this.io).includeConfig();
	}

	includeRoute() {
		new routes(this.app).routesConfig();
	}

	async appExecute() {
		var port = process.env.PORT || 8000;
		var ssl = process.env.SSL || "inactive";
		var ssl_key_path = process.env.SSL_KEY || null;
		var ssl_cert_path = process.env.SSL_CERT || null;
		var server = null;

		this.appConfig();
		this.includeRoute();
		if (ssl == "active") {
			let options = {
				key: fs.readFileSync(ssl_key_path),
				cert: fs.readFileSync(ssl_cert_path)
			};
			server = https.createServer(options, this.app);
		} else {
			server = http.createServer(this.app);
		}

		const io = require("socket.io")(server, {
			cors: {
				origin: "*",
				methods: ["GET", "POST"]
			}
		});

		// ✅ This is where your logic lives (userId map, event handlers, etc.)
		initSocket(io);

		server.listen(port);
		if (server.listening) {
			console.log(`Parking server is listening on this ${port}`);
		}

		if (process.env.CORN_JOB == "true") {
			console.log("✅ Cron job triggered");
			// cron.schedule("0 10 * * *", () => {
			// 	// Runs at 10:00 AM every day
			// 	cornJob.checkBookings();
			// });
			// cron.schedule("*/30 * * * * *", () => {
			// 	cornJob.checkBookings();
			// });
		}
	}
}

const app = new Server();
app.appExecute();
