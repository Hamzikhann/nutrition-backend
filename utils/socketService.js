let io;
const connectedUsers = new Map(); // userId => socket.id

function initSocket(serverIO) {
	io = serverIO;

	io.on("connection", (socket) => {
		console.log("✅ New socket connected:", socket.id);

		// Get userId from query or token (basic way for now)
		const userId = socket.handshake.query.userId;
		console.log("hand shake", userId);
		if (userId) {
			connectedUsers.set(userId, socket.id);
			console.log("👤 User connected:", userId);

			socket.on("disconnect", () => {
				console.log("❌ User disconnected:", userId);
				connectedUsers.delete(userId);
			});
		}
	});
}

function getSocketIO() {
	return io;
}

function emitToUser(userId, event, data) {
	let status = false;
	console.log("userId", userId);
	console.log("🧠 Emitting to:", userId);
	console.log("🗺️ Connected users:", connectedUsers);
	const socketId = connectedUsers.get(userId);
	console.log(socketId);
	if (socketId && io) {
		io.to(socketId).emit(event, data);
		status = true;
	}
	return status;
}

module.exports = {
	initSocket,
	getSocketIO,
	emitToUser
};
