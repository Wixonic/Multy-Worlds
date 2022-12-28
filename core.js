const http = require("http");
const WebSocket = require("ws");

class Core {
	static currentId = 0;
	static list = {};

	static get = (id) => Core.list[id];
	
	constructor () {
		this.id = `${Math.round(performance.now() * 1000).toString(36)}-${(Core.currentId++).toString(36)}`;
		Core.list[this.id] = this;
	};
};

class World extends Core {
	constructor (roomId) {
		super();

		this.roomId = roomId;
	};

	close () {
		const room = Core.get(this.roomId);
		room.status = "waiting";

		for (let u of room.list) {
			u.send("world-closed");
			u.send("room-changed");
		}
	};

	export () {
		return {
			description: this.description || "No description.",
			name: this.name || "No name"
		};
	};
};

class Test extends World {
	constructor (roomId) {
		super(roomId);

		this.description = "This is a test world.";
		this.name = "Test";
		this.usersNeeded = 1;
	};
};

exports.worlds = [
	Test
];

exports.room = class Room extends Core {
	constructor (owner) {
		super();

		this.list = [owner];
		this.owner = owner.id;
		this.type = "private";
		this.status = "waiting";
		this.world = null;
	};
	
	export () {
		let list = [];

		for (let user of this.list) {
			list.push(user.export());
		}

		return {
			id: this.id,
			list: list,
			owner: this.owner,
			type: this.type,
			world: this.world ? this.world.export() : null
		};
	};
};

exports.user = class User extends Core {
	constructor (ws,ip) {
		super();

		this._pingStart = 0;
		this._pingEnd = 0;

		this.ip = ip;
		this.ping = "??";
		this.name = `Player ${this.id}`;
		this.ws = ws;
	};

	export (me=false) {
		if (me) {
			return {
				id: this.id,
				ip: this.ip,
				ping: this.ping,
				name: this.name
			};
		} else {
			return {
				id: this.id,
				ping: this.ping,
				name: this.name
			};
		}
	};

	send (type,datas={}) {
		datas.type = type;
		this.ws.send(JSON.stringify(datas));
	};

	valid () {
		return this.version === exports.version;
	};
};

exports.server = http.createServer();
exports.wss = new WebSocket.Server({
	noServer: true
});

exports.server.on("upgrade",async (req,socket,head) => {
	const ip = req.socket.remoteAddress;
	
	exports.wss.handleUpgrade(req,socket,head,(ws) => {
		exports.wss.emit("connection",ws,ip);
	});
});

exports.server.listen(8080);

exports.forbiddenChars = ["<",">"];

exports.version = "0.0.1";