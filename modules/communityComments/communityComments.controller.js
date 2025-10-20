const { communityComments, users, communityPosts } = require("../../models");
const Redis = require("ioredis");
const redis = new Redis();
const joi = require("joi");
const encryptHelper = require("../../utils/encryptHelper");
const crypto = require("../../utils/crypto");
const deepenclone = require("../../utils/deepencryptedIds");
// TTL for cache in seconds
const Notifications = require("../../utils/notificationsHelper");

// TTL for cache in seconds
const CACHE_TTL = 60;

// Helper function to send comment notifications
const sendCommentNotification = async (postId, commenterId, commentText, action = "added") => {
	try {
		// Get post details and owner
		const post = await communityPosts.findOne({
			where: { id: postId },
			include: [
				{
					model: users,
					attributes: ["id", "firstName", "lastName"]
				}
			],
			attributes: ["id", "title", "userId"]
		});

		if (!post) return;

		// Get commenter info
		const commenter = await users.findOne({
			where: { id: commenterId },
			attributes: ["id", "firstName", "lastName"]
		});

		if (!commenter) return;

		const actionText = action === "added" ? "commented on" : "updated comment on";
		const notificationType = action === "added" ? "community_comment" : "community_comment_updated";

		// Send notification to post owner (if not the commenter themselves)
		if (post.user.id !== commenterId) {
			await Notifications.sendFcmNotification(
				post.user.id,
				"New Comment on Your Post",
				`${commenter.firstName} ${commenter.lastName} ${actionText} your post: "${post.title}"`,
				notificationType,
				{
					postId: postId.toString(),
					commenterId: commenterId.toString(),
					preview: commentText.substring(0, 100) // First 100 chars as preview
				}
			);
		}

		// For new comments, also notify other commenters on the same post
		if (action === "added") {
			const otherCommenters = await communityComments.findAll({
				where: {
					communityPostId: postId,
					userId: {
						[require("sequelize").Op.not]: [commenterId, post.userId] // Exclude commenter and post owner
					},
					isActive: "Y"
				},
				attributes: ["userId"],
				group: ["userId"],
				raw: true
			});

			const notificationPromises = otherCommenters.map((commenter) =>
				Notifications.sendFcmNotification(
					commenter.userId,
					"New Comment on Post",
					`${commenter.firstName} ${commenter.lastName} also commented on: "${post.title}"`,
					"community_comment_activity",
					{
						postId: postId.toString(),
						commenterId: commenterId.toString()
					}
				)
			);

			await Promise.allSettled(notificationPromises);
		}
	} catch (error) {
		console.error("Error sending comment notification:", error);
	}
};

exports.addComment = async (req, res) => {
	const joiSchema = joi.object({
		postId: joi.string().required(),
		comment: joi.string().required()
	});

	const { error, value } = joiSchema.validate(req.body);
	if (error) {
		return res.status(400).json({ message: error.details[0].message });
	}

	let { postId, comment } = value;
	let userId = crypto.decrypt(req.userId);
	postId = crypto.decrypt(postId);
	try {
		let getPost = communityPosts.findOne({ where: { id: postId }, attributes: ["id", "access"] });

		if (getPost.access == "false" && req.role != "Administrator") {
			return res.status(400).json({ message: "You don't have permission to comment on this post" });
		}

		if (!getPost) {
			return res.status(404).json({ message: "Post not found" });
		}

		const newComment = await communityComments.create({
			communityPostId: postId,
			userId,
			comment
		});

		// Invalidate Redis cache for this post
		await redis.del(`comments:${postId}`);

		encryptHelper(newComment);
		await sendCommentNotification(postId, userId, comment, "added");

		return res.status(201).json({
			message: "Comment added successfully",
			comment: newComment
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.getComments = async (req, res) => {
	let { postId } = req.body.postId;
	postId = crypto.decrypt(req.body.postId);

	try {
		// First check cache
		const cachedComments = await redis.get(`comments:${postId}`);
		if (cachedComments) {
			// cachedComments = encryptHelper(cachedComments);
			let parsedComments = JSON.parse(cachedComments);
			// Convert plain objects back to expected structure
			const structuredComments = parsedComments.map((comment) => ({
				dataValues: comment
			}));
			encryptHelper(structuredComments);
			return res.status(200).json({
				message: "Comments list (from cache)",
				comments: parsedComments
			});
		}

		// If not cached, fetch from DB
		const comments = await communityComments.findAll({
			where: { communityPostId: postId, isActive: "Y" },
			include: [{ model: users }],
			order: [["createdAt", "DESC"]]
		});

		// Store in cache
		await redis.setex(`comments:${postId}`, CACHE_TTL, JSON.stringify(comments));
		encryptHelper(comments);
		return res.status(200).json({
			message: "Comments list (from DB)",
			comments
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.deleteComment = async (req, res) => {
	let { commentId } = req.body.commentId;
	commentId = crypto.decrypt(req.body.commentId);

	try {
		const comment = await communityComments.findByPk(commentId);
		if (!comment) {
			return res.status(404).json({ message: "Comment not found" });
		}

		await comment.update(
			{
				isActive: "N"
			},
			{
				where: {
					id: commentId
				}
			}
		);

		// Invalidate Redis cache for related post
		await redis.del(`comments:${comment.communityPostId}`);

		return res.status(200).json({ message: "Comment deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.updateComment = async (req, res) => {
	try {
		const joiSchema = joi.object({
			commentId: joi.string().required(),
			comment: joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			return res.status(400).send({
				message: error.details[0].message
			});
		} else {
			const comment = await communityComments.findOne({
				where: {
					id: crypto.decrypt(value.commentId)
				}
			});
			if (!comment) {
				return res.status(400).json({
					message: "Comment not found"
				});
			}

			await communityComments.update(
				{
					comment: value.comment
				},
				{
					where: {
						id: crypto.decrypt(value.commentId)
					}
				}
			);

			// Invalidate Redis cache for related post
			await redis.del(`comments:${comment.communityPostId}`);

			await sendCommentNotification(comment.communityPostId, comment.userId, value.comment, "updated");

			return res.status(200).json({ message: "Comment updated successfully" });
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
};
