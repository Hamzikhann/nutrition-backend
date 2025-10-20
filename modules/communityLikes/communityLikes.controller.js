const db = require("../../models");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");
const Notifications = require("../../utils/notificationsHelper");

const { sequelize } = db;
const CommunityLikes = db.communityLikes;
const CommunityLikesCounter = db.communitylikesCounter;
const CommunityPosts = db.communityPosts;
const Users = db.users;

// Helper function to send reaction notifications
const sendReactionNotification = async (postId, userId, reactionType, action = "added") => {
	try {
		// Get post details and owner
		const post = await CommunityPosts.findOne({
			where: { id: postId },
			include: [
				{
					model: Users,
					attributes: ["id", "firstName", "lastName"]
				}
			],
			attributes: ["id", "title", "userId"]
		});

		if (!post) return;

		// Get reactor info
		const reactor = await Users.findOne({
			where: { id: userId },
			attributes: ["id", "firstName", "lastName"]
		});

		if (!reactor) return;

		// Don't notify if user is reacting to their own post
		if (post.userId === userId) return;

		const actionText = action === "added" ? "reacted to" : "removed reaction from";
		const notificationType = action === "added" ? "community_reaction" : "community_reaction_removed";

		// Map reaction type to emoji for better notification display
		const reactionEmojis = {
			love: "❤️"
		};

		const emoji = reactionEmojis[reactionType] || "👍";

		await Notifications.sendFcmNotification(
			post.userId,
			`${emoji} New Reaction on Your Post`,
			`${reactor.firstName} ${reactor.lastName} ${actionText} your post: "${post.title}"`,
			notificationType,
			{
				postId: postId.toString(),
				reactorId: userId.toString(),
				reactionType: reactionType,
				emoji: emoji
			}
		);
	} catch (error) {
		console.error("Error sending reaction notification:", error);
	}
};

// Helper function to send multiple reaction notifications for popular posts
const sendPopularPostNotification = async (postId, reactionCount) => {
	try {
		const post = await CommunityPosts.findOne({
			where: { id: postId },
			include: [
				{
					model: Users,
					attributes: ["id", "firstName", "lastName"]
				}
			],
			attributes: ["id", "title", "userId"]
		});

		if (!post) return;

		// Send notification to post owner when post reaches certain milestones
		const milestones = [5, 10, 25, 50, 100];
		if (milestones.includes(reactionCount)) {
			await Notifications.sendFcmNotification(
				post.userId,
				"🎉 Your Post is Getting Popular!",
				`Your post "${post.title}" has reached ${reactionCount} reactions!`,
				"community_post_popular",
				{
					postId: postId.toString(),
					reactionCount: reactionCount.toString(),
					milestone: reactionCount.toString()
				}
			);
		}
	} catch (error) {
		console.error("Error sending popular post notification:", error);
	}
};

/**
 * Write-through strategy:
 * - Update raw reaction row
 * - Update counts table (increment/decrement)
 * - Update Redis cache (if available)
 * - Send FCM notifications
 */
exports.addOrUpdateReaction = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		let { postId } = req.body;
		postId = crypto.decrypt(postId);
		let userId = crypto.decrypt(req.userId);
		const reactionType = "love";

		// Lock the user's reaction row for this post to avoid race conditions
		let existing = await CommunityLikes.findOne({
			where: { communityPostId: postId, userId },
			transaction: t,
			lock: t.LOCK.UPDATE
		});

		if (!existing) {
			// create reaction
			await CommunityLikes.create({ communityPostId: postId, userId, reactionType }, { transaction: t });

			// increment counter
			await CommunityLikesCounter.findOrCreate({
				where: { communityPostId: postId, reactionType },
				defaults: { count: 0 },
				transaction: t,
				lock: t.LOCK.UPDATE
			});
			await CommunityLikesCounter.increment(
				{ count: 1 },
				{
					where: { communityPostId: postId, reactionType },
					transaction: t
				}
			);
		}
		// else same reaction → no-op

		await t.commit();

		// get counts from counts table (fast)
		const rows = await CommunityLikesCounter.findAll({
			where: { communityPostId: postId },
			attributes: ["reactionType", "count"],
			order: [["reactionType", "ASC"]]
		});
		const counts = rows.map((r) => ({
			reactionType: r.reactionType,
			count: r.count
		}));

		// Calculate total reactions for popular post notification
		const totalReactions = counts.reduce((sum, reaction) => sum + reaction.count, 0);

		// update Redis cache (write-through)
		const redis = req.app.get("redis");
		if (redis) {
			const key = `post:${postId}:reactions`;
			const flat = [];
			counts.forEach((c) => flat.push(c.reactionType, String(c.count)));
			await redis.hset(key, ...flat);
			await redis.expire(key, 300); // 5 min TTL
		}

		// Send notifications only for new reactions
		if (!existing) {
			// Send reaction notification to post owner
			await sendReactionNotification(postId, userId, reactionType, "added");

			// Check for popular post milestone
			await sendPopularPostNotification(postId, totalReactions);
		}

		postId = crypto.encrypt(postId);
		return res.json({ success: true, postId, counts });
	} catch (err) {
		try {
			await t.rollback();
		} catch (_) {}
		console.error(err);
		return res.status(500).json({ success: false, error: err.message });
	}
};

exports.removeReaction = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		let { postId } = req.body;
		postId = crypto.decrypt(postId);
		let userId = crypto.decrypt(req.userId);

		const existing = await CommunityLikes.findOne({
			where: { communityPostId: postId, userId },
			transaction: t,
			lock: t.LOCK.UPDATE
		});

		if (!existing) {
			await t.rollback();
			return res.status(200).json({ success: true, postId, counts: [] });
		}

		const reactionType = existing.reactionType;

		await existing.destroy({ transaction: t });

		// decrement count for existing type
		await CommunityLikesCounter.increment(
			{ count: -1 },
			{
				where: { communityPostId: postId, reactionType: reactionType },
				transaction: t
			}
		);

		await t.commit();

		// fetch counts
		const rows = await CommunityLikesCounter.findAll({
			where: { communityPostId: postId },
			attributes: ["reactionType", "count"],
			order: [["reactionType", "ASC"]]
		});
		const counts = rows.map((r) => ({
			reactionType: r.reactionType,
			count: r.count
		}));

		// update Redis and broadcast
		const redis = req.app.get("redis");
		if (redis) {
			const key = `post:${postId}:reactions`;
			const flat = [];
			counts.forEach((c) => flat.push(c.reactionType, String(c.count)));
			await redis.hset(key, ...flat);
			await redis.expire(key, 300);
		}

		// Send notification for reaction removal
		await sendReactionNotification(postId, userId, reactionType, "removed");

		postId = crypto.encrypt(postId);
		return res.json({ success: true, postId, counts });
	} catch (err) {
		try {
			await t.rollback();
		} catch (_) {}
		console.error(err);
		return res.status(500).json({ success: false, error: err.message });
	}
};

/**
 * Read-through count fetch:
 * 1) Try Redis
 * 2) Fallback to DB, then warm cache
 */
exports.getPostReactionCounts = async (req, res) => {
	try {
		let { postId } = req.body;
		postId = crypto.decrypt(postId);
		const redis = req.app.get("redis");
		let counts = null;

		if (redis) {
			const key = `post:${postId}:reactions`;
			const hash = await redis.hgetall(key);
			if (hash && Object.keys(hash).length) {
				counts = Object.entries(hash).map(([reactionType, count]) => ({
					reactionType,
					count: Number(count)
				}));
			}
		}

		if (!counts) {
			const rows = await CommunityLikesCounter.findAll({
				where: { communityPostId: postId },
				include: [{ model: db.users }],
				attributes: ["reactionType", "count"],
				order: [["reactionType", "ASC"]]
			});
			counts = rows.map((r) => ({
				reactionType: r.reactionType,
				count: r.count
			}));

			if (redis) {
				const key = `post:${postId}:reactions`;
				const flat = [];
				counts.forEach((c) => flat.push(c.reactionType, String(c.count)));
				if (flat.length) {
					await redis.hset(key, ...flat);
					await redis.expire(key, 300);
				}
			}
		}

		postId = crypto.encrypt(postId);
		return res.json({ success: true, postId, counts });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ success: false, error: err.message });
	}
};

exports.list = async (req, res) => {
	try {
		let { postId } = req.body;
		const redis = req.app.get("redis");

		if (!postId) {
			return res.status(400).json({ success: false, message: "postId is required" });
		}

		// 🔐 Decrypt postId
		postId = crypto.decrypt(postId);

		// ✅ Get counts per reaction (e.g., { love: 3, like: 1 })
		const counts = await CommunityLikesCounter.findAll({
			where: { communityPostId: postId }
		});

		// ✅ Get list of users who liked/reacted to the post
		const userLikes = await CommunityLikes.findAll({
			where: { communityPostId: postId },
			include: [
				{
					model: db.users
				}
			],
			order: [["createdAt", "DESC"]]
		});

		// Encrypt the response data
		encryptHelper(counts);
		encryptHelper(userLikes);

		return res.status(200).json({
			success: true,
			data: {
				counts,
				userLikes
			}
		});
	} catch (err) {
		console.error("Error in fetching reactions:", err);
		return res.status(500).json({ success: false, error: err.message });
	}
};
