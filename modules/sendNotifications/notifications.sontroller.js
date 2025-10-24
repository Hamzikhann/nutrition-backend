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
		const userId = crypto.decrypt(req.userId); // From auth middleware
		const whereClause = {
			isdeleted: "N"
		};

		if (userId == !1) {
			whereClause.userId = userId;
		}

		const notifications = await db.notifications.findAndCountAll({
			where: whereClause,
			order: [["createdAt", "DESC"]]
		});

		encryptHelper(notifications.rows);
		res.status(200).json({
			success: true,
			data: {
				notifications: notifications.rows,
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
