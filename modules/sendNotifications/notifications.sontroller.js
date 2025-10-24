const db = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const Joi = require("@hapi/joi");

const Users = db.users;
const Notification = db.notifications;
const Booking = db.bookings;

exports.getUserNotifications = async (req, res) => {
	try {
		const userId = crypto.decrypt(req.userId);
		const whereClause = {
			isdeleted: "N"
		};

		if (userId != 1) {
			whereClause.userId = userId;
		}

		const notifications = await db.notifications.findAndCountAll({
			where: whereClause,
			order: [["createdAt", "DESC"]]
		});

		// Process notifications to extract post data from the string
		// const processedNotifications = notifications.rows.map((notification) => {
		// 	const notificationData = notification.toJSON();

		// 	// Extract post ID from the Sequelize instance string
		// 	if (notificationData.data && notificationData.data.post && typeof notificationData.data.post === "string") {
		// 		const postString = notificationData.data.post;

		// 		// Extract the post ID from the string format: "[object SequelizeInstance:communityPosts]"
		// 		// The actual post data might be embedded or you might need to extract the ID

		// 		// If you stored the actual post data, try to parse it
		// 		try {
		// 			// Try to see if there's JSON data in the string
		// 			const jsonMatch = postString.match(/\{.*\}/);
		// 			if (jsonMatch) {
		// 				notificationData.data.post = JSON.parse(jsonMatch[0]);
		// 			} else {
		// 				// If no JSON found, just store the extracted information
		// 				notificationData.data.post = {
		// 					type: "communityPost",
		// 					// Extract any available info from the string
		// 					originalString: postString
		// 				};
		// 			}
		// 		} catch (error) {
		// 			// If parsing fails, create a clean structure
		// 			notificationData.data.post = {
		// 				type: "communityPost",
		// 				category: notificationData.data.category
		// 				// You might need to fetch the actual post data separately if needed
		// 			};
		// 		}
		// 	}

		// 	return notificationData;
		// });

		encryptHelper(notifications);
		res.status(200).json({
			success: true,
			data: {
				notifications: notifications,
				totalCount: notifications.count
			}
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

exports.markAsRead = async (req, res) => {
	try {
		const userId = crypto.decrypt(req.userId);
		const { notificationId } = req.body;

		if (!notificationId) {
			return res.status(400).json({
				success: false,
				message: "Notification ID is required"
			});
		}

		const notification = await db.notifications.findOne({
			where: {
				id: crypto.decrypt(notificationId),
				userId: userId,
				isdeleted: "N"
			}
		});

		if (!notification) {
			return res.status(404).json({
				success: false,
				message: "Notification not found"
			});
		}

		await notification.update({
			isRead: true,
			readAt: new Date()
		});

		res.status(200).json({
			success: true,
			message: "Notification marked as read"
		});
	} catch (error) {
		console.error("Error marking notification as read:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

exports.deleteNotification = async (req, res) => {
	try {
		const userId = crypto.decrypt(req.userId);
		const { notificationId } = req.body;

		if (!notificationId) {
			return res.status(400).json({
				success: false,
				message: "Notification ID is required"
			});
		}

		const notification = await db.notifications.findOne({
			where: {
				id: crypto.decrypt(notificationId),
				userId: userId,
				isdeleted: "N"
			}
		});

		if (!notification) {
			return res.status(404).json({
				success: false,
				message: "Notification not found"
			});
		}

		await notification.update({
			isdeleted: "Y"
		});

		res.status(200).json({
			success: true,
			message: "Notification deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting notification:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

exports.markAllAsRead = async (req, res) => {
	try {
		const userId = crypto.decrypt(req.userId);

		await db.notifications.update(
			{
				isRead: true,
				readAt: new Date()
			},
			{
				where: {
					userId: userId,
					isRead: false,
					isdeleted: "N"
				}
			}
		);

		res.status(200).json({
			success: true,
			message: "All notifications marked as read"
		});
	} catch (error) {
		console.error("Error marking all notifications as read:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};
