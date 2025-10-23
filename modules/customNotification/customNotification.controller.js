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

		const notification = await db.customNotification.create({
			title,
			content,
			notificationCategoriesFolderId: folderId,
			status: "Pending"
		});

		// Send notifications to users in the folder
		let userIds = [];
		try {
			userIds = JSON.parse(folder.users);
		} catch (error) {
			console.error("Error parsing folder users:", error);
			return res.status(400).json({
				success: false,
				message: "Invalid users data in folder"
			});
		}

		let sendSuccess = true;
		const failedUsers = [];
		for (const userId of userIds) {
			try {
				let encryptNotification = encryptHelper(notification);
				const result = await Notifications.sendFcmNotification(userId, title, content, "custom", {
					notificationId: encryptNotification.id
				});
				if (!result) {
					sendSuccess = false;
					failedUsers.push(userId);
				}
			} catch (error) {
				console.error(`Error sending notification to user ${userId}:`, error);
				sendSuccess = false;
				failedUsers.push(userId);
			}
		}

		// Update notification status
		await notification.update({
			status: sendSuccess ? "Sent" : "Failed",
			sentAt: sendSuccess ? new Date() : null
		});

		encryptHelper(notification);
		res.status(201).json({
			success: true,
			message: sendSuccess
				? "Notification created and sent successfully"
				: "Notification created but sending failed for some users",
			data: {
				...notification.toJSON(),
				folderName: folder.name,
				sendSuccess,
				failedUsers: sendSuccess ? [] : failedUsers
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
