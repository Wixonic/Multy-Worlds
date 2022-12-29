const PORT = parseInt(process.env.PORT) || 8080;
const VERSION = "0.1.0";

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

io.on("connection",(socket) => {
	console.log(`${socket.id}: Connected`);

	socket.ping = () => {
		const pingStart = performance.now();
		socket.emit("ping",Math.ceil(socket.currentPing),() => {
			socket.currentPing = performance.now() - pingStart;
		});

		setTimeout(socket.ping,1000);
	};

	socket.ping();

	socket.emit("ask","version",(version) => {
		if (version !== VERSION) {
			console.error(`${socket.id}: Running on "${version}", expected "${VERSION}"`);
			socket.disconnect(true);
		}
	});

	socket.on("change-name",(name,answer) => {
		if (typeof name === "string" && name.length >= 3) {
			
		} else {
			name = `Player_${socket.id}`;
		}

		console.log(`${socket.id}: Changing name to "${name}"`);
		socket.name = name;
		answer(name);
	});

	socket.on("disconnecting",(reason) => {
		console.warn(`${socket.id}: Disconnected (${reason})`);
	});
});

server.listen(PORT,() => console.info(`Server: listening on port ${PORT}`));