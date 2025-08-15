// const db = require("../models");
// const sendNotification = require("../utils/notificationsHelper");
// const emails = require("../utils/emails");
// const Users = db.users;
// const Bookings = db.bookings;
// const Registration = db.registration;
// const Vehicle = db.vehicle;
// const BookingAssignment = db.bookingAssignments;

// exports.checkBookings = async (req) => {
// 	try {
// 		const date = new Date();
// 		const bookingAssignments = await BookingAssignment.findAll({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: Bookings,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: Registration,
// 							where: { isActive: "Y" }
// 						},
// 						{
// 							model: Vehicle,
// 							where: { isActive: "Y" }
// 						}
// 					]
// 				},
// 				{
// 					model: Users,
// 					as: "employee",
// 					where: { isActive: "Y" }
// 				}
// 			]
// 		});
// 		if (bookingAssignments.length > 0) {
// 			for (const assignment of bookingAssignments) {
// 				const booking = assignment.booking;

// 				// Skip if booking is already completed or started
// 				if (booking.status === "Completed" || booking.status === "Started") {
// 					continue;
// 				}

// 				const bookingStartDate = new Date(booking.startDate);
// 				const timeDiff = bookingStartDate - date; // milliseconds
// 				const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert to days

// 				// Handle past bookings (daysDiff < 0)
// 				if (daysDiff < 0 && booking.status === "Inprogress") {
// 					// Cancel the booking
// 					await booking.update({
// 						status: "Cancelled"
// 					});

// 					// Notify customer about cancellation
// 					await sendNotification.sendFcmNotification(
// 						booking.userId,
// 						"Booking Cancelled",
// 						`Your airport ride to ${booking.airport} (Booking ID: ${booking.id}) has been automatically cancelled as the date has passed.`
// 					);

// 					// Notify employee about cancellation
// 					await sendNotification.sendFcmNotification(
// 						assignment.employeeId,
// 						"Assignment Cancelled",
// 						`Your assigned ride to ${booking.airport} (Booking ID: ${booking.id}) has been cancelled as the date has passed.`
// 					);

// 					continue;
// 				}

// 				// Send reminders for all upcoming bookings (any daysDiff >= 0)
// 				if (daysDiff >= 0) {
// 					let dayText;
// 					if (daysDiff === 0) {
// 						dayText = "today";
// 					} else if (daysDiff === 1) {
// 						dayText = "tomorrow";
// 					} else {
// 						dayText = `in ${daysDiff} days`;
// 					}

// 					// Notify the customer
// 					await sendNotification.sendFcmNotification(
// 						booking.userId,
// 						"Upcoming Booking Reminder",
// 						`Your airport ride to ${booking.airport} (Booking ID: ${booking.id}) is scheduled for ${dayText}.`
// 					);

// 					// Notify the assigned employee
// 					await sendNotification.sendFcmNotification(
// 						assignment.employeeId,
// 						"Upcoming Assignment Reminder",
// 						`You have a ride to ${booking.airport} (Booking ID: ${booking.id}) scheduled for ${dayText}.`
// 					);
// 				}
// 			}
// 		}

// 		const allBookings = await Bookings.findAll({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: Registration,
// 					where: { isActive: "Y" }
// 				},
// 				{
// 					model: Vehicle,
// 					where: { isActive: "Y" }
// 				}
// 			]
// 		});

// 		// Get all assigned booking IDs
// 		const assignedBookingIds = bookingAssignments.map((assignment) => assignment.bookingId);

// 		// Filter out unassigned bookings
// 		const unassignedBookings = allBookings.filter((booking) => {
// 			return (
// 				!assignedBookingIds.includes(booking.id) && booking.status !== "Completed" && booking.status !== "Cancelled"
// 			);
// 		});
// 		// Identify bookings to cancel (unassigned AND past start date AND inprogress)
// 		const currentDate = new Date();
// 		const bookingsToCancel = unassignedBookings.filter((booking) => {
// 			const bookingDate = new Date(booking.startDate);
// 			return booking.status === "Inprogress" && bookingDate < currentDate;
// 		});

// 		// Cancel the identified bookings
// 		const cancelledBookings = [];

// 		for (const booking of bookingsToCancel) {
// 			await Bookings.update(
// 				{
// 					status: "Cancelled"
// 				},
// 				{
// 					where: {
// 						id: booking.id
// 					}
// 				}
// 			);
// 			cancelledBookings.push(booking);
// 			// Notify customer
// 			await sendNotification.sendFcmNotification(
// 				booking.userId,
// 				"Booking Cancelled",
// 				`Your booking (ID: ${booking.id}) has been automatically cancelled.`
// 			);
// 		}
// 		// // Send email with attachments if there are any bookings to report
// 		if (unassignedBookings.length > 0 || cancelledBookings.length > 0) {
// 			await emails.sendAdminNotificationEmail({
// 				unassignedBookings: unassignedBookings,
// 				cancelledBookings: cancelledBookings
// 			});
// 			// Send FCM notification
// 			await sendNotification.sendFcmNotification(
// 				1, // admin user ID or appropriate target
// 				"Booking System Report",
// 				`New report: ${unassignedBookings.length} unassigned, ${cancelledBookings.length} cancelled bookings`
// 			);
// 			console.log("✅ Booking reminders and cancellations processed successfully.");
// 		}
// 	} catch (err) {
// 		console.error("❌ Error in checkBookings cron job:", err.message);
// 		// Send error email
// 		// await emails.errorEmail(req, err);
// 	}
// };
