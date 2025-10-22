const db = require("../../models");

const createNotification = async (req, res) => {
	try {
		const { title, content, userIds, folderId, scheduledAt } = req.body;

		if (!title || !content || !userIds || !folderId) {
			return res.status(400).json({
				success: false,
				message: "Title, content, userIds, and folderId are required"
			});
		}

		const notification = await db.customNotification.create({
			title,
			content,
			userIds: JSON.stringify(userIds),
			notificationCategoriesFolderId: folderId,
			scheduledAt: scheduledAt || null,
			status: scheduledAt ? "Scheduled" : "Pending"
		});

		res.status(201).json({
			success: true,
			message: "Notification created successfully",
			data: notification
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
			where: { isActive: "Y", isdeleted: "N" },
			include: [{
				model: db.notificationCategoriesFolder,
				as: "notificationCategoriesFolder",
				where: { isActive: "Y", isdeleted: "N" },
				required: false
			}],
			order: [["createdAt", "DESC"]]
		});

		const notificationsWithUsers = notifications.map(notification => ({
			...notification.toJSON(),
			userIds: JSON.parse(notification.userIds)
		}));

		res.status(200).json({
			success: true,
			data: notificationsWithUsers
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
