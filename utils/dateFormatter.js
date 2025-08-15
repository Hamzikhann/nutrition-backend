const formatDateToDDMMYYYY = (date) => {
	if (!(date instanceof Date)) date = new Date(date);
	return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
};

const responseDateFormatter = (req, res, next) => {
	const originalJson = res.json;
	res.json = function (data) {
		const cache = new WeakSet();
		const formattedData = JSON.stringify(data, (key, value) => {
			if (typeof value === "object" && value !== null) {
				if (cache.has(value)) return "[Circular]";
				cache.add(value);
			}
			return value instanceof Date ? formatDateToDDMMYYYY(value) : value;
		});
		originalJson.call(this, JSON.parse(formattedData));
	};
	next();
};

module.exports = responseDateFormatter;
