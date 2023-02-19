const { FORBIDDEN_CHARS, PORT, VERSION } = require("./static.js");
const { World } = require("./worlds.js");

const server = require("http").createServer();
var io = new (require("socket.io").Server)(server,{
	connectTimeout: 5000,
	pingInterval: 5000,
	pingTimeout: 10000,
	upgradeTimeout: 10000,

	reconnection: true,
	reconnectionAttempts: 5,

	maxHttpBufferSize: 1e6,
	path: "/",
	serveClient: false,

	cors: {
		origin: [
			"https://admin.socket.io",
			"https://multy.wixonic.fr"
		],
		credentials: true
	}
});

require("@socket.io/admin-ui").instrument(io,{ auth: false });

server.listen(PORT,() => console.info(`Listening on ${server.address().address}:${server.address().port} (${server.address().family})`));

io.rooms = {};
Object.defineProperty(io,"publicRooms",{
	get: () => Object.values(io.rooms).filter((room) => room.status === "waiting" && room.mode === "public" && room.usersCount < Room.maxUsersCount).sort((a,b) => b.usersCount - a.usersCount)
});
class Room {
	static idPlage = 36 ** 4;
	static maxUsersCount = 8;

	static checkId (id) {
		if (typeof id === "string" && id.length >= 3 && id.length <= 15 && !io.of("/").sockets.has(id) && !io.of("/").adapter.rooms.has(id)) {
			FORBIDDEN_CHARS.forEach((char) => id = id.split(char[0]).join(char[1]));
		} else {
			id = Room.generateId();
		}

		return id;
	};

	static generateId () {
		return Room.checkId(Math.floor(Math.random() * (Room.idPlage - Room.idPlage / 36) + Room.idPlage / 36).toString(36));
	};

	constructor (id,mode) {
		this.id = id || Room.generateId();
		this.mode = mode || "private";
		this.status = "waiting";
		this.users = [];
	};

	get canJoin () {
		return this.usersCount < Room.maxUsersCount && this.status === "waiting";
	};

	get owner () {
		return this.users[0];
	};

	get usersCount () {
		return this.users.length;
	};

	export () {
		let users = [];

		this.users.forEach((uid) => {
			const user = io.of("/").sockets.get(uid);

			users.push({
				id: uid,
				name: user.name,
				owner: this.owner === uid,
				ping: Math.ceil(user.currentPing)
			});
		});

		return {
			id: this.id,
			mode: this.mode,
			status: this.status,
			users: users
		};
	};

	lightExport () {
		return {
			id: this.id,
			mode: this.mode,
			usersCount: this.usersCount
		};
	};
};


io.of("/").adapter.on("delete-room",(id) => {
	if (io.rooms[id] instanceof Room) {
		delete io.rooms[id];
	}
});

io.of("/").adapter.on("join-room",(id,uid) => {
	if (id !== uid) {
		const user = io.of("/").sockets.get(uid);

		if (user.room) {
			user.leave(id);
			user.emit("room",io.rooms[id].export());
		} else {
			if (io.rooms[id] instanceof Room) {
				if (io.rooms[id].usersCount >= Room.maxUsersCount) {
					return;
				} else {				
					io.rooms[id].users.push(uid);
					user.to(id).emit("room-user-joined",user.name);
				}
			} else {
				io.rooms[id] = new Room(id,io.rooms[id]);
				io.rooms[id].users = [uid];
			}

			user.room = id;
			user.emit("room",io.rooms[id].export());
		}
	}
});

io.of("/").adapter.on("leave-room",(id,uid) => {
	if (io.rooms[id] instanceof Room) {
		const userIndex = io.rooms[id].users.indexOf(uid);
		const user = io.of("/").sockets.get(uid);
		io.rooms[id].users.splice(userIndex,1);
		io.to(id).except(uid).emit("room-user-leaved",user.name,user.leaveReason);
		delete user.room;
		user.emit("room-leaved");

		if (userIndex === 0) {
			const newOwner = io.of("/").sockets.get(io.rooms[id].users[0]);

			if (newOwner) {
				newOwner.emit("room-owner",true);
			}
		}
	};
});


io.on("connection",(socket) => {
	socket.on("disconnecting",() => socket.leaveReason = "disconnected");

	socket.emit("ask","version",(version) => {
		if (version !== VERSION) {
			socket.disconnect(true);
		}
	});

	socket.emit("meta",{
		rooms: {
			maxUsersCount: Room.maxUsersCount
		}
	});



	socket.on("change-name",(name,callback) => {
		if (socket.name !== name) {
			if (typeof name === "string" && name.length >= 3 && name.length <= 20) {
				FORBIDDEN_CHARS.forEach((char) => name = name.split(char[0]).join(char[1]));
			} else {
				name = socket.id;
			}

			socket.name = name;
			callback(name);
		}
	});



	socket.on("game-start",(callback) => {
		if (io.rooms[socket.room] instanceof Room && io.rooms[socket.room].owner === socket.id && io.rooms[socket.room].status === "waiting") {
			io.rooms[socket.room].status = "loading";

			const world = World();

			console.log(world);

			let ready = 0;

			const check = () => {
				if (io.rooms[socket.room] instanceof Room && world) {
					if (ready === io.rooms[socket.room].usersCount) {
						io.rooms[socket.room].status = "playing";
						io.to(socket.room).emit("game-start");

						world.end = () => {
							io.to(socket.room).emit("game-ended");
							io.rooms[socket.room].status = "waiting";
						};

						world.start({
							get broadcast() {
								return io.in(socket.room);
							},
							get room () {
								return io.rooms[socket.room];
							},
							get sockets () {
								return io.in(socket.room).fetchSockets();
							}
						});
					}
				}
			};

			io.rooms[socket.room].users.forEach((uid) => {
				const user = io.of("/").sockets.get(uid);

				const timeout = setTimeout(() => {
					socket.leaveReason = "failed to load world";
					user.leave(socket.room);
					check();
				},10000);

				user.emit("game-load",world.id,() => {
					clearTimeout(timeout);
					ready++;
					check();
				});
			});
		} else if (io.rooms[socket.room].status !== "waiting") {
			callback();
		}
	});



	socket.on("room-change-mode",(mode,callback) => {
		if (io.rooms[socket.room] instanceof Room && io.rooms[socket.room].owner === socket.id) {
			io.rooms[socket.room].mode = mode ? "private" : "public";
			callback();
		}
	});

	socket.on("room-check-id",(id,callback) => callback(Room.checkId(id)));

	socket.on("room-create",(id) => {
		id = Room.checkId(id);
		socket.join(id);
	});

	socket.on("room-generate-id",(callback) => callback(Room.generateId()));

	socket.on("room-quick-join",() => {
		const room = io.publicRooms[0];

		if (room instanceof Room && room.canJoin) {
			socket.join(room.id);
		} else {
			const id = Room.generateId();
			io.rooms[id] = "public";
			socket.join(id);
		}
	});

	socket.on("room-join",(id,callback) => {
		const room = io.rooms[id];

		if (room instanceof Room && room.canJoin) {
			socket.join(id);
		} else {
			callback();
		}
	});

	socket.on("room-leave",() => {
		socket.leaveReason = "clicked on the button";
		socket.leave(socket.room);
	});

	socket.on("room-kick",(uid,callback) => {
		const room = io.rooms[socket.room];
		const user = io.of("/").sockets.get(uid);

		if (room instanceof Room && room.owner === socket.id && room.users.includes(uid)) {
			io.to(room.id).except(uid).emit("room-user-kicked",user.name || user.id,socket.name || socket.id);
			user.leaveReason = `kicked by ${socket.name || socket.id}`;
			user.leave(socket.room);
		} else {
			callback();
		}
	});

	socket.on("room-message",(message) => {
		const room = io.rooms[socket.room];
		
		if (room instanceof Room && typeof message === "string" && message.length >= 1) {
			message = message.slice(0,150);

			FORBIDDEN_CHARS.forEach((char) => message = message.split(char[0]).join(char[1]));

			io.to(room.id).emit("room-message",{
				author: {
					id: socket.id,
					name: socket.name
				},
				content: message,
				type: "user",
				style: room.owner === socket.id ? "owner" : "default"
			});
		}
	});



	socket.on("rooms-get",(callback) => {
		let rooms = [];
		io.publicRooms.forEach((room) => rooms.push(room.lightExport()));
		callback(rooms);
	});



	/* socket.ping = () => {
		const pingStart = performance.now();
		socket.volatile.emit("ping",Math.ceil(socket.currentPing),(io.rooms[socket.room] instanceof Room ? io.rooms[socket.room].export() : null),() => socket.currentPing = performance.now() - pingStart);
		setTimeout(socket.ping,1000);
	};
	socket.ping(); */
});



process.on("SIGTERM",() => {
	logger.info(`${pkg.name}: received SIGTERM`);
	closeConnection();
	logger.end();
	logger.on("finish", () => process.exit(0));
});