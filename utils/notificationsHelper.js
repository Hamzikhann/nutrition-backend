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

		const message = {
			token: user.fcmToken,
			notification: {
				title,
				body
			},
			data: {
				type: type || "general",
				...data
			}
		};
		console.log(message);
		await admin.messaging().send(message);

		let createNotificationObj = {
			userId: userId,
			title: title,
			body: body,
			isRead: false,
			type: type || "general"
		};

		await Notification.create(createNotificationObj);

		console.log(`FCM notification sent to user ${userId}: ${title}`);
		return true;
	} catch (err) {
		console.log(err);
		console.error("sendFcmNotification error:", err.message);
		return false;
	}
};

module.exports = Notifications;
