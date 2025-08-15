// const fs = require("fs");
// const path = require("path");
// const _ = require("lodash");
// const { parse, format } = require("date-fns");
// const formats = require("./formates.json");

// class csvParser {
// 	constructor() {
// 		this.transformers = {
// 			split: (value, params) => {
// 				const separator = params[0];
// 				const index = parseInt(params[1]);
// 				const parts = value.split(separator);

// 				if (index === -1) return parts.slice(1).join(separator).trim();
// 				return parts[index]?.trim() || null;
// 			},
// 			date: (value, params) => {
// 				const [fromFormat, toFormat] = params;
// 				try {
// 					const date = parse(value, fromFormat, new Date());
// 					return format(date, toFormat);
// 				} catch (e) {
// 					return value; // Return original if parsing fails
// 				}
// 			},
// 			default: (value) => value
// 		};
// 	}

// 	detectFormat(headers) {
// 		return formats.formats.find((format) => format.identifiers.every((id) => headers.includes(id))) || null;
// 	}

// 	parseValue(value, transformString) {
// 		if (!transformString || !value) return value;

// 		const [transformName, ...params] = transformString.split(":");
// 		const transformer = this.transformers[transformName] || this.transformers.default;
// 		return transformer(value, params);
// 	}

// 	transformRow(row, format) {
// 		const result = {
// 			booking: {
// 				reference: null,
// 				startDate: null,
// 				startTime: null,
// 				endDate: null,
// 				endTime: null,
// 				status: "Inprogress"
// 			},
// 			customer: {
// 				firstName: null,
// 				lastName: null,
// 				phone: null,
// 				email: null
// 			},
// 			vehicle: {
// 				registration: null,
// 				make: null,
// 				model: null,
// 				color: null,
// 				passengers: 0
// 			},
// 			flight: {
// 				outboundNumber: null,
// 				inboundNumber: null,
// 				departureTerminal: null,
// 				arrivalTerminal: null
// 			},
// 			airport: {
// 				code: null,
// 				name: null
// 			},
// 			payment: {
// 				amount: 0,
// 				reference: null
// 			}
// 		};

// 		if (!format) {
// 			// Fallback to generic parsing
// 			return this.genericParse(row);
// 		}

// 		Object.entries(format.mappings).forEach(([targetPath, sourceField]) => {
// 			const [field, transform] = sourceField.includes("|") ? sourceField.split("|") : [sourceField, null];

// 			if (row[field]) {
// 				const value = this.parseValue(row[field], transform);
// 				_.set(result, targetPath, value);
// 			}
// 		});

// 		// Post-processing
// 		if (result.airport.code) {
// 			result.booking.airport = result.airport.code;
// 		}

// 		return result;
// 	}

// 	genericParse(row) {
// 		const result = {
// 			booking: {
// 				reference: row["Booking Ref"] || row["Reference Number"] || row["ID"] || null,
// 				startDate: row["Start Date"] || row["Entry Date"] || null,
// 				startTime: row["Start Time"] || row["Entry Time"] || null,
// 				endDate: row["End Date"] || row["Return Date"] || null,
// 				endTime: row["End Time"] || row["Return Time"] || null,
// 				status: "Inprogress"
// 			},
// 			customer: {
// 				firstName: null,
// 				lastName: null,
// 				phone: null,
// 				email: null
// 			},
// 			vehicle: {
// 				registration: null,
// 				make: null,
// 				model: null,
// 				color: null,
// 				passengers: 0
// 			},
// 			flight: {
// 				outboundNumber: null,
// 				inboundNumber: null,
// 				departureTerminal: null,
// 				arrivalTerminal: null
// 			},
// 			payment: {
// 				amount: parseFloat(row["Price"] || row["Amount"] || 0),
// 				reference: null
// 			}
// 		};

// 		// Try to parse customer name
// 		if (row["Customer"] || row["Customer Name"]) {
// 			const nameStr = row["Customer"] || row["Customer Name"];
// 			const nameParts = nameStr.split("\n")[0].trim().split(" ");
// 			result.customer.firstName = nameParts[0] || null;
// 			result.customer.lastName = nameParts.slice(1).join(" ") || null;

// 			// Try to extract phone if it's in the same field
// 			const phoneMatch = nameStr.match(/(\d{10,})/);
// 			if (phoneMatch) {
// 				result.customer.phone = phoneMatch[1];
// 			}
// 		}

// 		// Try to parse vehicle info
// 		if (row["Vehicle Make/Reg"] || row["Vehicle"]) {
// 			const vehicleParts = (row["Vehicle Make/Reg"] || row["Vehicle"]).split("\n");
// 			result.vehicle.make = vehicleParts[0]?.trim() || null;
// 			result.vehicle.model = vehicleParts[1]?.trim() || null;
// 			result.vehicle.color = vehicleParts[2]?.trim() || null;
// 			result.vehicle.registration = vehicleParts[3]?.trim() || null;
// 		}

// 		return result;
// 	}
// }

// module.exports = csvParser;

// services/csvImporter.js
const csv = require("csv-parser");
const fs = require("fs");
const db = require("../models");

class CSVImporter {
	static async importCSV(file, formatType = "auto") {
		try {
			// 3. Get the model - try different access patterns
			const ImportRecord = db.mongoModels?.ImportRecord || db.ImportRecord || mongoose.model("ImportRecord");

			const results = [];
			let headers = [];

			// Read CSV file
			await new Promise((resolve, reject) => {
				fs.createReadStream(file.path)
					.pipe(csv())
					.on("headers", (h) => (headers = h))
					.on("data", (data) => results.push(data))
					.on("end", resolve)
					.on("error", reject);
			});

			// Store in MongoDB
			const importRecord = await ImportRecord.create({
				sourceFile: file.filename,
				originalFilename: file.originalname,
				formatType,
				headers,
				records: results,
				metadata: {
					recordCount: results.length,
					firstRecord: results[0] || null
				}
			});

			return importRecord;
		} catch (error) {
			console.error("CSV Import Error:", error);
			throw error; // Re-throw for controller to handle
		}
	}
}

module.exports = CSVImporter;
