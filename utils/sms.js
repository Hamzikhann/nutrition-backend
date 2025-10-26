const twilio = require("twilio");

// Replace with your actual Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Sms component
 * @constructor
 */
function Sms() {}

// /**
//  * Sends an OTP via SMS using Twilio
//  * @param {string} otp - The one-time password/code
//  * @param {string} toPhone - The recipient's phone number (E.164 format, e.g., '+923001234567')
//  */

Sms.sendOtpSms = async (otp, toPhone) => {
	try {
		const message = await client.messages.create({
			body: `Your OTP code is: ${otp}`,
			from: fromPhone,
			to: toPhone
		});

		console.log("Message sent! SID:", message.sid);
		return { success: true, sid: message.sid };
	} catch (error) {
		console.error("Failed to send SMS:", error.message);
		return { success: false, error: error.message };
	}
};

module.exports = Sms;
