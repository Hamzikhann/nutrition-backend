// const admin = require("firebase-admin");
// const socketService = require("../utils/socketService");
// const crypto = require("../utils/crypto");
// const db = require("../models");
// const Users = db.users;
// const Notification = db.notifications;

// /**
//  * Notification component
//  * @constructor
//  */

// function Notifications() {}

// Notifications.sendSocketNotification = async ({ toUserId, event, data = {} }) => {
// 	try {
// 		// const userId = isNaN(toUserId) ? toUserId : toUserId;
// 		socketService.emitToUser(toUserId, event, data);

// 		return true;
// 	} catch (err) {
// 		console.error("sendSocketNotification error:", err.message);
// 		return false;
// 	}
// };

// Notifications.sendFcmNotification = async (toUserId, title, body, type) => {
// 	try {
// 		const userId = isNaN(toUserId) ? crypto.decrypt(toUserId) : toUserId;

// 		const user = await Users.findOne({
// 			where: { id: userId, isActive: "Y" }
// 		});

// 		if (!user || !user.fcmToken) {
// 			console.warn("FCM: No valid user or token found");
// 			return false;
// 		}

// 		await admin.messaging().send({
// 			token: user.fcmToken,
// 			notification: {
// 				title,
// 				body
// 			}
// 		});
// 		let createNotificationObj = {
// 			userId: userId,
// 			title: title,
// 			body: body,
// 			isRead: false,
// 			type: type
// 		};

// 		let createNotification = await Notification.create(createNotificationObj);

// 		return true;
// 	} catch (err) {
// 		console.error("sendFcmNotification error:", err.message);
// 		return false;
// 	}
// };
// module.exports = Notifications;
