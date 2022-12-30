const { FORBIDDEN_CHARS, PORT, VERSION } = require("./static.js");

const server = require("http").createServer();
const io = new (require("socket.io").Server)(server,{
	connectTimeout: 5000,
	pingInterval: 1000,
	pingTimeout: 5000,
	upgradeTimeout: 5000,

	maxHttpBufferSize: 1e3,
	path: "/",
	serveClient: false,

	cors: {
		origin: true
	}
});


io.rooms = {};
Object.defineProperty(io,"publicRooms",{
	get: () => Object.values(io.rooms).sort((a,b) => b.usersCount - a.usersCount).filter((room) => room.mode === "public" && room.usersCount < Room.maxUsersCount)
});
class Room {
	static idPlage = 36 ** 4;
	static maxUsersCount = 8;

	static checkId (id) {
		if (typeof id === "string" && id.length >= 3 && id.length <= 15 && !io.of("/").sockets.has(id) && !io.of("/").adapter.rooms.has(id)) {
			for (let el of FORBIDDEN_CHARS) {
				id = id.split(el[0]).join(el[1]);
			}
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
		this.users = [];
	};

	get owner () {
		return this.users[0];
	};

	get usersCount () {
		return this.users.length;
	};

	export () {
		let users = [];

		for (let uid of this.users) {
			const user = io.of("/").sockets.get(uid);

			users.push({
				id: uid,
				name: user.name,
				owner: this.owner === uid,
				ping: Math.ceil(user.currentPing)
			});
		}

		return {
			id: this.id,
			mode: this.mode,
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
					user.volatile.to(id).emit("room-user-joined",user.name);
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
		const user = io.of("/").sockets.get(uid);
		io.rooms[id].users.splice(io.rooms[id].users.indexOf(uid),1);
		user.volatile.to(id).emit("room-user-leaved",user.name);
		delete user.room;
		user.emit("leaved");
	};
});


io.on("connection",(socket) => {
	socket.emit("ask","version",(version) => {
		if (version !== VERSION) {
			console.error(`${socket.id}: Running on "${version}", expected "${VERSION}"`);
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
				for (let el of FORBIDDEN_CHARS) {
					name = name.split(el[0]).join(el[1]);
				}
			} else {
				name = socket.id;
			}

			socket.name = name;
			callback(name);
		}
	});


	socket.on("room-check-id",(id,callback) => callback(Room.checkId(id)));

	socket.on("room-generate-id",(callback) => {
		callback(Room.generateId());
	});

	socket.on("room-quick-join",() => {
		const room = io.publicRooms[0];

		if (room instanceof Room) {
			socket.join(room.id);
		} else {
			const id = Room.generateId();
			io.rooms[id] = "public";
			socket.join(id);
		}
	});

	socket.on("room-join",(id,callback) => {
		if (io.rooms[id] instanceof Room && io.rooms[id].usersCount < Room.maxUsersCount) {
			socket.join(id);
		} else {
			callback();
		}
	});

	socket.on("room-create",(id) => {
		id = Room.checkId(id);
		socket.join(id);
	});

	socket.on("rooms-get",(callback) => {
		let rooms = [];

		for (let room of io.publicRooms) {
			rooms.push(room.lightExport());
		}

		callback(rooms);
	});

	socket.on("room-message",(message) => {
		const room = io.rooms[socket.room];
		
		if (room instanceof Room && typeof message === "string" && message.length >= 1) {
			message = message.slice(0,150);

			for (let el of FORBIDDEN_CHARS) {
				message = message.split(el[0]).join(el[1]);
			}

			io.to(room.id).volatile.emit("room-message",{
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


	socket.ping = () => {
		const room = io.rooms[socket.room];
		const pingStart = performance.now();
		socket.emit("ping",Math.ceil(socket.currentPing),room instanceof Room ? room.export().users : [],() => socket.currentPing = performance.now() - pingStart);
		setTimeout(socket.ping,1000);
	};
	socket.ping();
});


server.listen(PORT,() => console.info(`Server is listening on port ${PORT}`));