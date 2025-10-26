const admin = require("firebase-admin");
const crypto = require("../utils/crypto");
const db = require("../models");
const Users = db.users;
const Notification = db.notifications;

/**
 * Notification component
 * @constructor
 */

function Notifications() {}

// Updated FCM Notification Function
Notifications.sendFcmNotification = async (toUserId, title, body, type, data = {}) => {
	try {
		const userId = isNaN(toUserId) ? crypto.decrypt(toUserId) : toUserId;

		const user = await Users.findOne({
			where: { id: userId, isActive: "Y" }
		});

		if (!user || !user.fcmToken) {
			console.warn("FCM: No valid user or token found for user ID:", userId);
			return false;
		}

		// Convert all data values to strings - handle objects by stringifying them
		// const stringData = {};
		// Object.keys(data).forEach((key) => {
		// 	const value = data[key];

		// 	if (value === null || value === undefined) {
		// 		stringData[key] = "";
		// 	} else if (typeof value === "object" || Array.isArray(value)) {
		// 		// Stringify objects and arrays
		// 		stringData[key] = JSON.stringify(value);
		// 	} else {
		// 		// Convert other types to string
		// 		stringData[key] = String(value);
		// 	}
		// });

		const message = {
			token: user.fcmToken,
			notification: {
				title,
				body
			},
			data: {
				type: type || "general",
				data: JSON.stringify(data)
			}
		};
		await admin.messaging().send(message);

		// Save to individual notifications table - store the stringified data
		await db.notifications.create({
			userId: userId,
			title: title,
			body: body,
			isRead: false,
			type: type || "general",
			data: JSON.stringify(data) // This will store the stringified post data
		});

		console.log(`FCM notification sent to user ${userId}: ${title}`);
		return true;
	} catch (err) {
		console.error("sendFcmNotification error:", err.message);
		const userId = isNaN(toUserId) ? crypto.decrypt(toUserId) : toUserId;

		// Handle invalid token error
		if (err.errorInfo && err.errorInfo.code === "messaging/registration-token-not-registered") {
			console.log(`Removing invalid FCM token for user ${userId}`);

			try {
				await Users.update({ fcmToken: null }, { where: { id: userId } });
				console.log(`Invalid FCM token removed for user ${userId}`);
			} catch (updateError) {
				console.error(`Error removing token for user ${userId}:`, updateError);
			}
		}

		return false;
	}
};
module.exports = Notifications;
