const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const redis = new Redis();

exports.signToken = (data, expiresIn = process.env.JWT_EXPIRES_IN) => {
	return jwt.sign(data, process.env.JWT_SECRET, { expiresIn });
};

exports.protect = async (req, res, next) => {
	try {
		const token = req.headers["access-token"];
		if (!token) {
			return res.status(400).send({
				message: "No Access Token"
			});
		}

		// Verify JWT
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Check if token matches the active session in Redis
		const activeToken = await redis.get(`session:${decoded.userId}`);
		if (!activeToken || activeToken !== token) {
			return res.status(440).send({
				message: "Session has expired. Please log in again."
			});
		}

		// Attach user info to request
		Object.assign(req, {
			userId: decoded.userId,
			roleId: decoded.roleId,
			role: decoded.role,
			email: decoded?.email
		});

		next();
	} catch (err) {
		res.status(440).send({
			message: err.message || "Session has expired."
		});
	}
};

exports.resetPasswordProtect = (req, res, next) => {
	const token = req.params.token;

	if (token) {
		jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
			if (err) {
				res.status(440).send({
					message: err.message || "Session has been expired."
				});
			} else {
				Object.assign(req, {
					userId: decoded.userId,
					profileId: decoded.profileId,
					clientId: decoded.clientId,
					roleId: decoded.roleId,
					email: decoded.email
				});
				next();
			}
		});
	} else {
		res.status(400).send({
			message: "No Access Token"
		});
	}
};
