const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const cron = require("node-cron");
const Redis = require("ioredis"); // 🔹 Added Redis

const appConfig = require("./config/app");
const routes = require("./routes/routes");
const db = require("./models/index");
const cornJob = require("./utils/cornJob");
const { initSocket } = require("./utils/socketService");

const dateFormatter = require("./utils/dateFormatter");

// Initialize Firebase Admin SDK (if needed)

class Server {
	constructor() {
		this.app = express();
		this.io = require("socket.io")();

		// 🔹 Initialize Redis
		this.redis = new Redis({
			host: process.env.REDIS_HOST || "127.0.0.1",
			port: process.env.REDIS_PORT || 6379
		});

		this.redis.on("connect", () => {
			console.log("✅ Connected to Redis");
		});

		this.redis.on("error", (err) => {
			console.error("❌ Redis error:", err);
		});

		// 🚨 Block access to sensitive files
		this.app.use((req, res, next) => {
			const forbiddenPatterns = /\.(env|yml|yaml|json|config|sql|git|htaccess|save|swp|lock|log)$/i;
			if (forbiddenPatterns.test(req.url)) {
				console.warn(`🚨 Blocked suspicious request: ${req.method} ${req.url}`);
				return res.sendStatus(403);
			}
			next();
		});

		this.app.use(dateFormatter);

		// 🔹 Make Redis available to all requests
		this.app.use((req, res, next) => {
			req.redis = this.redis;
			next();
		});

		// DB Sync
		db.sequelize
			.sync()
			.then(() => {
				console.log("✅ Synced db.");
			})
			.catch((err) => {
				console.log("❌ Failed to sync db: " + err);
			});
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

		// 🔹 Pass Redis to Socket service
		initSocket(io, this.redis);

		server.listen(port);
		if (server.listening) {
			console.log(`🚀 Server is listening on port ${port}`);
		}

		if (process.env.CORN_JOB == "true") {
			console.log("✅ Cron job triggered");
			// cron.schedule("0 10 * * *", () => cornJob.checkBookings());
		}
	}
}

const app = new Server();
app.appExecute();
