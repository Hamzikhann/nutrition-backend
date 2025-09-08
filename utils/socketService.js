let io;
const connectedUsers = new Map(); // userId => socket.id

function initSocket(serverIO) {
	io = serverIO;

	io.on("connection", (socket) => {
		console.log("✅ New socket connected:", socket.id);

		// Get userId from query or token (basic way for now)
		const userId = socket.handshake.query.userId;
		if (userId) {
			connectedUsers.set(userId, socket.id);
			console.log("👤 User connected:", userId);

			socket.on("disconnect", () => {
				console.log("❌ User disconnected:", userId);
				connectedUsers.delete(userId);
			});
		}

		// 🔹 Optional: let clients join a "post room"
		socket.on("joinPost", (postId) => {
			socket.join(`post_${postId}`);
			console.log(`📌 User ${userId} joined room for post ${postId}`);
		});

		socket.on("leavePost", (postId) => {
			socket.leave(`post_${postId}`);
			console.log(`📌 User ${userId} left room for post ${postId}`);
		});
	});
}

function getSocketIO() {
	return io;
}

function emitToUser(userId, event, data) {
	let status = false;
	const socketId = connectedUsers.get(userId);
	if (socketId && io) {
		io.to(socketId).emit(event, data);
		status = true;
	}
	return status;
}

// 🔹 Broadcast to everyone
function emitToAll(event, data) {
	if (io) {
		io.emit(event, data);
	}
}

// 🔹 Broadcast to all users in a post room
function emitToPostRoom(postId, event, data) {
	if (io) {
		io.to(`post_${postId}`).emit(event, data);
	}
}

module.exports = {
	initSocket,
	getSocketIO,
	emitToUser,
	emitToAll,
	emitToPostRoom
};
