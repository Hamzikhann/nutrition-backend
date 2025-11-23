const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const cron = require("node-cron");
const Redis = require("ioredis");

const appConfig = require("./config/app");
const routes = require("./routes/routes");
const db = require("./models/index");
const { initSocket } = require("./utils/socketService");
const admin = require("firebase-admin");

const dateFormatter = require("./utils/dateFormatter");

// Import your cron jobs
const CronJobs = require("./utils/cornJob"); // Adjust path to your cron jobs file

// Initialize Firebase Admin SDK
const serviceAccount = require("./fitcysters-ce4c3-firebase-adminsdk-fbsvc-5837f79c49.json");

class Server {
	constructor() {
		this.app = express();
		this.io = require("socket.io")();

		// Initialize Redis
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

		// Block access to sensitive files
		this.app.use((req, res, next) => {
			const forbiddenPatterns = /\.(env|yml|yaml|json|config|sql|git|htaccess|save|swp|lock|log)$/i;
			if (forbiddenPatterns.test(req.url)) {
				console.warn(`🚨 Blocked suspicious request: ${req.method} ${req.url}`);
				return res.sendStatus(403);
			}
			next();
		});

		this.app.use(dateFormatter);

		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount)
		});

		// Make Redis available to all requests
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

	initializeCronJobs() {
		console.log("🕐 Initializing cron jobs...");

		// Method 1: Initialize using your CronJobs class
		// CronJobs.init();

		// Method 2: Or initialize individual cron jobs manually
		// if (process.env.CRON_JOBS_ENABLED === "true") {
		// 	this.setupCronJobsManually();
		// }

		console.log("✅ Cron jobs initialized successfully");
	}

	// setupCronJobsManually() {
	// 	// Trial User Deactivation - Daily at midnight
	// 	cron.schedule('0 0 * * *', async () => {
	// 		console.log('🕐 Running trial user deactivation cron job...');
	// 		// Call your trial deactivation function here
	// 	});

	// 	// Plan User Deactivation - Daily at 1 AM
	// 	cron.schedule('0 1 * * *', async () => {
	// 		console.log('🕐 Running expired plan user deactivation cron job...');
	// 		// Call your plan deactivation function here
	// 	});

	// 	// Expiry Notifications - Daily at 9 AM
	// 	cron.schedule('0 9 * * *', async () => {
	// 		console.log('🕐 Running expiry notification cron job...');
	// 		// Call your notification function here
	// 	});

	// 	// Health check cron - Every 30 minutes
	// 	cron.schedule('*/30 * * * *', () => {
	// 		console.log('🏥 Server health check - Running normally');
	// 	});

	// 	// Cache cleanup - Every Sunday at 2 AM
	// 	cron.schedule('0 2 * * 0', async () => {
	// 		console.log('🧹 Running weekly cache cleanup...');
	// 		// Add cache cleanup logic here
	// 	});
	// }

	async appExecute() {
		const port = process.env.PORT || 8000;
		const ssl = process.env.SSL || "inactive";
		const ssl_key_path = process.env.SSL_KEY || null;
		const ssl_cert_path = process.env.SSL_CERT || null;
		let server = null;

		this.appConfig();
		this.includeRoute();

		// 🔹 Initialize Cron Jobs BEFORE starting the server
		this.initializeCronJobs();

		if (ssl === "active") {
			const options = {
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

		// Pass Redis to Socket service
		initSocket(io);

		server.listen(port, () => {
			console.log(`🚀 Server is listening on port ${port}`);
			console.log(`⏰ Cron jobs status: ${process.env.CRON_JOBS_ENABLED || "Enabled"}`);
		});

		// Graceful shutdown
		process.on("SIGTERM", () => {
			console.log("🛑 SIGTERM received, shutting down gracefully");
			server.close(() => {
				console.log("✅ Process terminated");
			});
		});

		process.on("SIGINT", () => {
			console.log("🛑 SIGINT received, shutting down gracefully");
			server.close(() => {
				console.log("✅ Process terminated");
			});
		});
	}
}

const app = new Server();
app.appExecute();
