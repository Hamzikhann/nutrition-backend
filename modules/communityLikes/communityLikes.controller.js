const db = require("../../models");
// const socketService = require("../../utils/socketService");
const crypto = require("../../utils/crypto");
const encryptHelper = require("../../utils/encryptHelper");

const { sequelize } = db;
const CommunityLikes = db.communityLikes;
const CommunityLikesCounter = db.communitylikesCounter;

/**
 * Write-through strategy:
 * - Update raw reaction row
 * - Update counts table (increment/decrement)
 * - Update Redis cache (if available)
 * - Emit Socket.IO event to viewers of that post
 */
exports.addOrUpdateReaction = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		let { postId, reactionType } = req.body;
		postId = crypto.decrypt(postId);
		let userId = crypto.decrypt(req.userId);

		// Lock the user's reaction row for this post to avoid race conditions
		let existing = await CommunityLikes.findOne({
			where: { communityPostId: postId, userId },
			transaction: t,
			lock: t.LOCK.UPDATE
		});

		if (existing) {
			if (existing.reactionType !== reactionType) {
				// decrement old
				await CommunityLikesCounter.increment(
					{ count: -1 },
					{
						where: { communityPostId: postId, reactionType: existing.reactionType },
						transaction: t
					}
				);

				// ensure target counter row exists, then increment
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

				existing.reactionType = reactionType;
				await existing.save({ transaction: t });
			}
			// else same reaction → no-op
		} else {
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

		// update Redis cache (write-through)
		const redis = req.app.get("redis");
		if (redis) {
			const key = `post:${postId}:reactions`;
			const flat = [];
			counts.forEach((c) => flat.push(c.reactionType, String(c.count)));
			await redis.hset(key, ...flat);
			await redis.expire(key, 300); // 5 min TTL
		}

		// ✅ Notify all users in post room
		// socketService.emitToPostRoom(postId, "reactionUpdate", { postId, counts });
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

		// decrement count for existing type
		await CommunityLikesCounter.increment(
			{ count: -1 },
			{
				where: { communityPostId: postId, reactionType: existing.reactionType },
				transaction: t
			}
		);

		await existing.destroy({ transaction: t });
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

		// ✅ Notify all users in post room
		// socketService.emitToPostRoom(postId, "reactionUpdate", { postId, counts });
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
