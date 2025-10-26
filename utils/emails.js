const fs = require("fs");
const secrets = require("../config/secrets");
const nodeMailer = require("./nodeMailer");
const crypto = require("../utils/crypto");
const { Workbook } = require("exceljs"); // Import exceljs library
const path = require("path");

const baseURL = secrets.frontend_URL;

const emailErrorTo = secrets.email.error;
const emailFrom = secrets.email.auth.from;

/**
 * Email component
 * @constructor
 */
function Email() {}

Email.errorEmail = async (req, error) => {
	try {
		const data = fs.readFileSync("./templates/emailError.html", "utf8");
		var text = data;
		const userInfo = {
			userId: req.userId ? crypto.decrypt(req.userId) : "NULL",
			roleId: req.roleId ? crypto.decrypt(req.roleId) : "NULL",
			role: req.role ? req.role : "NULL"
		};
		// =================== device info ====================
		const DeviceDetector = require("device-detector-js");
		const deviceDetector = new DeviceDetector();
		const userAgent = req.headers && req.headers["user-agent"] ? req.headers["user-agent"] : null;
		const deviceInfo = userAgent ? deviceDetector.parse(userAgent) : null;
		//=====================================================
		text = text.replace("[USER_INFO]", JSON.stringify(userInfo));
		text = text.replace("[DEVICE_INFO]", JSON.stringify(deviceInfo));
		text = text.replace("[API]", JSON.stringify(req.originalUrl));
		text = text.replace("[METHOD]", req.method ? req.method : null);
		text = text.replace("[REQ_BODY]", JSON.stringify(req.body));
		text = text.replace("[REQ_PARAMS]", JSON.stringify(req.params));
		text = text.replace("[ERROR]", error);
		var mailOptions = {
			from: `Park Pilot <${emailFrom}>`,
			to: emailErrorTo,
			subject: "ERROR in Park Pilot(" + req.headers.origin + ")",
			html: text
		};
		return nodeMailer(mailOptions);
	} catch (error) {
		error;
		throw error;
	}
};

Email.forgotPassword = async (user, otp) => {
	try {
		// var link = baseURL + "reset/password/" + forgetPasswordToken;

		const data = fs.readFileSync("./templates/emailForgotPassword.html", "utf8");
		var text = data;
		text = text.replace("[USER_NAME]", user.firstName + " " + user.lastName);
		text = text.replace("[OTP]", otp);
		// text = text.replace("[TEXT_LINK]", link);

		var mailOptions = {
			from: `Park Pilot <${emailFrom}>`,
			to: user.email,
			subject: "Reset Password OTP",
			html: text
		};

		nodeMailer(mailOptions);
	} catch (error) {
		error;
		throw error;
	}
};

Email.sendVerificationEmail = async (email, otp) => {
	try {
		const data = fs.readFileSync("./templates/sendVerificationEmail.html", "utf8");
		var text = data;
		text = text.replace("[OTP]", otp);
		// text = text.replace("[TEXT_LINK]", link);
		console.log(emailFrom);
		var mailOptions = {
			from: `Fit Cysters <${emailFrom}>`,
			to: email,
			subject: "Verify Email",
			html: text
		};

		nodeMailer(mailOptions);
	} catch (error) {
		error;
		throw error;
	}
};

Email.sendAdminNotificationEmail = async ({ unassignedBookings = [], cancelledBookings = [] }) => {
	try {
		// Generate Excel files
		const generateExcelFile = async (bookings, type) => {
			const workbook = new Workbook();
			const worksheet = workbook.addWorksheet("Bookings");

			// Add headers
			worksheet.columns = [
				{ header: "Booking ID", key: "id", width: 15 },
				{ header: "Customer Name", key: "customer", width: 25 },
				{ header: "Contact", key: "contact", width: 20 },
				{ header: "Airport", key: "airport", width: 15 },
				{ header: "Date", key: "date", width: 15 },
				{ header: "Vehicle", key: "vehicle", width: 25 },
				{ header: "Status", key: "status", width: 15 }
			];

			// Add data rows
			bookings.forEach((booking) => {
				worksheet.addRow({
					id: booking.id,
					customer: `${booking.registrations[0]?.firstName} ${booking.registrations[0]?.lastName}`,
					contact: booking.registrations[0]?.phoneNo || "N/A",
					email: booking.registrations[0]?.email || "N/A",
					airport: booking.airport,
					date: booking.startDate,
					vehicle: `${booking.vehicles[0]?.vehicleManufacturer} ${booking.vehicles[0]?.vehicleModel}`,
					status: booking.status
				});
			});

			// Create temp directory if it doesn't exist
			const tempDir = path.join(__dirname, "temp");
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir);
			}

			const filePath = path.join(tempDir, `${type}_bookings_${Date.now()}.xlsx`);
			await workbook.xlsx.writeFile(filePath);
			return filePath;
		};

		// Generate attachments
		const attachments = [];
		if (unassignedBookings.length > 0) {
			const unassignedPath = await generateExcelFile(unassignedBookings, "unassigned");
			attachments.push({
				filename: `Unassigned_Bookings_${new Date().toISOString().split("T")[0]}.xlsx`,
				path: unassignedPath
			});
		}

		if (cancelledBookings.length > 0) {
			const cancelledPath = await generateExcelFile(cancelledBookings, "cancelled");
			attachments.push({
				filename: `Cancelled_Bookings_${new Date().toISOString().split("T")[0]}.xlsx`,
				path: cancelledPath
			});
		}

		// Prepare email content
		const emailSubject = `Booking Alert: ${unassignedBookings.length} Unassigned, ${cancelledBookings.length} Cancelled`;

		let emailText = `URGENT BOOKING ALERT\n\n`;
		emailText += `Unassigned Bookings: ${unassignedBookings.length}\n`;
		emailText += `Automatically Cancelled Bookings: ${cancelledBookings.length}\n\n`;

		if (unassignedBookings.length > 0) {
			emailText += `UNASSIGNED BOOKINGS REQUIRING ATTENTION:\n`;
			unassignedBookings.slice(0, 5).forEach((booking, index) => {
				emailText += `${index + 1}. ID: ${booking.id} | ${booking.airport} | ${booking.startDate}\n`;
			});
			if (unassignedBookings.length > 5) {
				emailText += `...and ${unassignedBookings.length - 5} more\n`;
			}
			emailText += `\n`;
		}

		if (cancelledBookings.length > 0) {
			emailText += `RECENTLY CANCELLED BOOKINGS:\n`;
			cancelledBookings.slice(0, 5).forEach((booking, index) => {
				emailText += `${index + 1}. ID: ${booking.id} | ${booking.airport} | ${booking.startDate}\n`;
			});
			if (cancelledBookings.length > 5) {
				emailText += `...and ${cancelledBookings.length - 5} more\n`;
			}
			emailText += `\n`;
		}

		emailText += `ACTION REQUIRED:\n`;
		emailText += `1. Review attached Excel files for complete details\n`;
		emailText += `2. Assign drivers to unassigned bookings immediately\n`;
		emailText += `3. Check cancellation reasons for cancelled bookings\n\n`;
		emailText += `This is an automated alert.`;

		// Send email
		const mailOptions = {
			from: `Park Pilot Alerts <${emailFrom}>`,
			to: process.env.ADMIN_EMAIL || "hamzaqasim.c@gmail.com",
			subject: emailSubject,
			text: emailText,
			attachments: attachments
		};

		await nodeMailer(mailOptions);
		console.log("Admin notification email sent with attachments");

		// Clean up temp files
		attachments.forEach((attachment) => {
			try {
				fs.unlinkSync(attachment.path);
			} catch (cleanupError) {
				console.error("Error cleaning up temp file:", attachment.path, cleanupError);
			}
		});
	} catch (error) {
		console.error("Failed to send admin notification:", error);
		throw error;
	}
};

module.exports = Email;
