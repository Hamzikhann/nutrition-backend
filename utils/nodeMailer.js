const nodemailer = require("nodemailer");
const secrets = require("../config/secrets");

const emailSend = secrets.email.send;
const emailAPIKey = secrets.email.auth.api_key;

// async function nodeMailer(mailOptions) {
// 	// return 1;
// 	// emailAPIKey;
// 	console.log(emailSend);

// 	if (emailSend == "active") {
// 		console.log("hellow");
// 		const transporter = await nodemailer.createTransport({
// 			host: "smtp.sendgrid.net",
// 			port: 465,
// 			auth: {
// 				user: "apikey",
// 				pass: emailAPIKey
// 			}
// 		});
// 		try {
// 			await transporter.verify();
// 		} catch (error) {
// 			throw error;
// 		}
// 		const info = await transporter.sendMail(mailOptions);
// 		console.log("Email sent to ", mailOptions.to, info);
// 		return info;
// 	} else {
// 		return 1;
// 	}
// }

async function nodeMailer(mailOptions) {
	if (emailSend !== "active") {
		console.log("Email sending is disabled.");
		return 1;
	}

	console.log("Attempting to send email to:", mailOptions.to);

	const transporter = nodemailer.createTransport({
		host: "smtp.sendgrid.net",
		port: 2525, // Recommended for TLS
		secure: false,
		auth: {
			user: "apikey",
			pass: emailAPIKey
		},
		tls: {
			ciphers: "TLSv1.2", // Force TLS 1.2
			rejectUnauthorized: false // Bypass SSL cert validation (if needed)
		}
		// logger: true // Enable debug logs
		// debug: true
	});

	try {
		// Verify SMTP connection
		await transporter.verify();
		console.log("SMTP connection verified.");

		// Send email
		const info = await transporter.sendMail(mailOptions);
		console.log("Email sent successfully:", info.response);
		return info;
	} catch (error) {
		console.error("Email sending failed:", error);
		throw error; // Re-throw for upstream handling
	}
}

module.exports = nodeMailer;
