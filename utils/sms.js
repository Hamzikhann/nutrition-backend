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

// Example usage:
// let network_topology = {
// 	building1: {
// 		floor1: {
// 			room1: {
// 				device1: {
// 					id: "A123",
// 					status: "active"
// 				},
// 				device2: {
// 					id: "B456",
// 					status: "inactive"
// 				}
// 			},
// 			room2: {
// 				device3: {
// 					id: "C789",
// 					status: "active"
// 				}
// 			}
// 		},
// 		floor2: {
// 			room3: {
// 				device4: {
// 					id: "D012",
// 					status: "inactive"
// 				}
// 			}
// 		}
// 	},
// 	building2: {
// 		floor1: {
// 			room4: {
// 				device5: {
// 					id: "E345",
// 					status: "active"
// 				}
// 			}
// 		}
// 	}
// };

// function logic(network_topology){
// 	let activeDevice=[]
// 	let network_topology_new=[]
// 	network_topology_new=network_topology

// for(let i=0;i<network_topology.length;i++){
// 	for(let j=0;j<network_topology[i].length;j++){
// 		for(let k=0;k<network_topology[i][j].length;k++){
// 			if(network_topology[i][j][k].status=="active"){
// 				activeDevice.push(network_topology[i][j][k].id)
// 			}
// 		}
// 	}
// }

// }
