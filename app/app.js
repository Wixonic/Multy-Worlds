const PORT = parseInt(process.env.PORT) || 8080;
const VERSION = "0.0.1";

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
		console.info(`${socket.id}: Running on ${version}`);
	});

	socket.on("ask",(data,answer) => {
		console.log(`${socket.id}: Asking "${data}"`);

		switch (data) {
			default:
				answer();
				break;
		}
	});

	socket.on("disconnecting",(reason) => {
		console.warn(`${socket.id}: Disconnected (${reason})`);
	});
});

server.listen(PORT,() => console.info(`Server: listening on port ${PORT}`));