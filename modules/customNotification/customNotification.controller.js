const db = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const Notifications = require("../../utils/notificationsHelper");

const createNotification = async (req, res) => {
	try {
		let { title, content, folderId } = req.body;

		if (!title || !content || !folderId) {
			return res.status(400).json({
				success: false,
				message: "Title, content, and folderId are required"
			});
		}

		// Decrypt folderId
		try {
			folderId = crypto.decrypt(folderId);
		} catch (error) {
			console.error("Error decrypting folderId:", error);
			return res.status(400).json({
				success: false,
				message: "Invalid folderId"
			});
		}

		// Verify folder exists and get its users
		const folder = await db.notificationCategoriesFolder.findOne({
			where: {
				id: folderId,
				isdeleted: "N"
			}
		});

		if (!folder) {
			return res.status(404).json({
				success: false,
				message: "Folder not found"
			});
		}

		// Send notifications to users in the folder
		let userIds = [];
		try {
			userIds = JSON.parse(folder.users);
			// Remove duplicate user IDs
			userIds = [...new Set(userIds)];
		} catch (error) {
			console.error("Error parsing folder users:", error);
			return res.status(400).json({
				success: false,
				message: "Invalid users data in folder"
			});
		}

		const notification = await db.customNotification.create({
			title,
			content,
			notificationCategoriesFolderId: folderId,
			status: "Pending",
			totalUsers: userIds.length
		});

		let sentCount = 0;
		let failedCount = 0;
		const failedUsers = [];
		const successfulUsers = [];
		const deliveryStats = {};

		for (const userId of userIds) {
			try {
				const result = await Notifications.sendFcmNotification(userId, title, content, "custom", {
					notificationId: String(crypto.encrypt(notification.id))
				});

				if (result) {
					sentCount++;
					successfulUsers.push(userId);
					deliveryStats[userId] = { status: "sent", timestamp: new Date() };
				} else {
					failedCount++;
					failedUsers.push(userId);
					deliveryStats[userId] = { status: "failed", timestamp: new Date(), reason: "FCM failed" };
				}
			} catch (error) {
				console.error(`Error sending notification to user ${userId}:`, error);
				failedCount++;
				failedUsers.push(userId);
				deliveryStats[userId] = {
					status: "failed",
					timestamp: new Date(),
					reason: error.message
				};
			}
		}

		// Update notification status based on results
		let finalStatus = "Failed";
		if (sentCount === userIds.length) {
			finalStatus = "Sent";
		} else if (sentCount > 0) {
			finalStatus = "Partial";
		}

		await notification.update({
			status: finalStatus,
			sentAt: sentCount > 0 ? new Date() : null,
			sentCount,
			failedCount,
			successfulUsers,
			failedUsers,
			deliveryStats
		});

		encryptHelper(notification);
		res.status(201).json({
			success: true,
			message: getStatusMessage(finalStatus, sentCount, failedCount),
			data: {
				...notification.toJSON(),
				folderName: folder.name
			}
		});
	} catch (error) {
		console.error("Error creating notification:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

const getNotifications = async (req, res) => {
	try {
		const notifications = await db.customNotification.findAll({
			where: {
				isdeleted: "N"
			},
			include: [
				{
					model: db.notificationCategoriesFolder,
					attributes: ["id", "name", "users"]
				}
			],
			order: [["createdAt", "DESC"]]
		});
		encryptHelper(notifications);
		res.status(200).json({
			success: true,
			data: notifications
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

const updateNotification = async (req, res) => {
	try {
		const { id } = req.params;
		const { title, content, userIds, scheduledAt } = req.body;

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "Notification ID is required"
			});
		}

		const notification = await db.customNotification.findByPk(id);
		if (!notification) {
			return res.status(404).json({
				success: false,
				message: "Notification not found"
			});
		}

		const updateData = {};
		if (title) updateData.title = title;
		if (content) updateData.content = content;
		if (userIds) updateData.userIds = JSON.stringify(userIds);
		if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;

		await notification.update(updateData);

		res.status(200).json({
			success: true,
			message: "Notification updated successfully",
			data: {
				...notification.toJSON(),
				userIds: userIds ? userIds : JSON.parse(notification.userIds)
			}
		});
	} catch (error) {
		console.error("Error updating notification:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

const deleteNotification = async (req, res) => {
	try {
		const { id } = req.params;

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "Notification ID is required"
			});
		}

		const notification = await db.customNotification.findByPk(id);
		if (!notification) {
			return res.status(404).json({
				success: false,
				message: "Notification not found"
			});
		}

		await notification.update({ isdeleted: "Y" });

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

const sendNotification = async (req, res) => {
	try {
		const { id } = req.params;

		const notification = await db.customNotification.findByPk(id);
		if (!notification) {
			return res.status(404).json({
				success: false,
				message: "Notification not found"
			});
		}

		// Here you would implement the actual sending logic
		// For now, just update the status
		await notification.update({
			status: "Sent",
			sentAt: new Date()
		});

		res.status(200).json({
			success: true,
			message: "Notification sent successfully"
		});
	} catch (error) {
		console.error("Error sending notification:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error"
		});
	}
};

module.exports = {
	createNotification,
	getNotifications,
	updateNotification,
	deleteNotification,
	sendNotification
};
