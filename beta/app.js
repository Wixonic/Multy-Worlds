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
class Room {
	constructor (id) {
		this.id = id;
		this.mode = "private";
		this.users = [];
	};

	get owner () {
		return this.users[0];
	};

	async emit (emmiter,event,...args) {
		if (emmiter) {
			io.of("/").sockets.get(emmiter).to(this.id).emit(event,...args);
		} else {
			io.to(this.id).emit(event,...args);
		}
	};
};


io.of("/").adapter.on("delete-room",(id) => {
	if (io.rooms[id] instanceof Room) {
		console.log(`Room deleted: ${id}`);
		delete io.rooms[id];
	}
});

io.of("/").adapter.on("join-room",(id,uid) => {
	if (io.rooms[id] instanceof Room) {
		console.log(`${uid}: Joined ${id}`);
		io.rooms[id].users.push(uid);
		io.rooms[id].emit(uid,"user-joined",uid);
	} else if (id !== uid) {
		console.log(`${uid}: Created ${id}`);
		io.rooms[id] = new Room(id);
		io.rooms[id].users = [uid];
	}
});

io.of("/").adapter.on("leave-room",(id,uid) => {
	if (io.rooms[id] instanceof Room) {
		console.log(`${uid}: Leaved ${id}`);
		io.rooms[id].users.splice(io.rooms[id].users.indexOf(uid));
		io.rooms[id].emit(uid,"user-leaved",uid);
	};
});


io.on("connection",(socket) => {
	console.log(`${socket.id}: Connected`);

	socket.emit("ask","version",(version) => {
		if (version !== VERSION) {
			console.error(`${socket.id}: Running on "${version}", expected "${VERSION}"`);
			socket.disconnect(true);
		}
	});

	socket.on("change-name",(name,answer) => {
		if (typeof name === "string" && name.length >= 3) {
			for (let el of FORBIDDEN_CHARS) {
				name = name.split(el[0]).join(el[1]);
			}
		} else {
			name = `Player_${socket.id}`;
		}

		console.log(`${socket.id}: Changing name to "${name}"`);
		socket.name = name;
		answer(name);
	});

	socket.on("join-room",(id,callback) => {
		if (typeof id === "string" && id) {
			for (let el of FORBIDDEN_CHARS) {
				id = id.split(el[0]).join(el[1]);
			}
		} else {
			id = Math.floor(Math.random() * (36 ** 4 - 36 ** 3) + 36 ** 3).toString(36);
		}

		socket.join(id);
		callback(id);
	});


	socket.ping = () => {
		const pingStart = performance.now();
		socket.emit("ping",Math.ceil(socket.currentPing),() => {
			socket.currentPing = performance.now() - pingStart;
		});

		setTimeout(socket.ping,1000);
	};
	socket.ping();


	socket.on("disconnecting",(reason) => {
		console.warn(`${socket.id}: Disconnected (${reason})`);
	});
});


server.listen(PORT,() => console.info(`Server: listening on port ${PORT}`));