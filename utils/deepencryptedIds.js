const crypto = require("../utils/crypto");

function deepEncryptIds(obj) {
	console.log(typeof obj);
	console.log(obj);
	if (!obj) return obj;

	// Handle arrays
	if (Array.isArray(obj)) {
		console.log(obj);
		return obj.map((item) => deepEncryptIds(item));
	}

	// Handle Sequelize instances (they have dataValues)
	if (obj.dataValues) {
		return deepEncryptIds(obj.dataValues);
	}

	// Handle plain objects
	if (typeof obj === "object" && obj !== null) {
		const result = {};

		for (const key in obj) {
			// Skip dates and timestamps
			if (key.endsWith("At") || key.endsWith("Date") || key.endsWith("date")) {
				result[key] = obj[key];
				continue;
			}

			// Encrypt ID fields
			if ((key.endsWith("id") || key.endsWith("Id")) && obj[key] && obj[key] !== 0) {
				console.log(obj[key]);
				result[key] = crypto.encrypt(obj[key]);
			}
			// Recursively process nested objects/arrays
			else if (typeof obj[key] === "object") {
				result[key] = deepEncryptIds(obj[key]);
			}
			// Copy other values as-is
			else {
				result[key] = obj[key];
			}
		}

		return result;
	}

	// Return non-object values as-is
	return obj;
}

module.exports = deepEncryptIds;
