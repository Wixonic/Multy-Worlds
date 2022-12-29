const VERSION = "0.0.1";

let server = "eu";

try {
	const searchParams = new URLSearchParams(location.search);
	server = searchParams.get("server")

	if (!["as","eu","us"].includes(server)) {
		server = "eu";
	}
} catch {}
server = location.hostname === "localhost" ? "local" : server;
history.pushState(null,"",`${location.protocol}//${location.host}${location.pathname}?server=${server}`);

window.addEventListener("DOMContentLoaded",() => {
	const socket = io(location.hostname === "localhost" ? "ws://localhost:8080" : `${location.protocol === "https:" ? "wss" : "ws"}://${server}.ws.multy.wixonic.fr`,{
		path: "/",
		rememberUpgrade: true,
		timeout: 5000,
		transports: ["websocket"]
	});


	const Display = {
		errors: {
			fatal: (e="Unknown error") => {
				const main = document.querySelector("main");
				main.setAttribute("status","fatal-error");
				main.innerHTML = `<h1>Fatal error</h1><code>${e}</code><p>A fatal error occured. Don't worry, <b>check your internet connection</b>, and <b>reload</b> this page.</p><p>If it is recurrent, please <a href="mailto:contact@wixonic.fr">contact us</a>, or try to <b>change server</b>.</p><button id="reload">Reload page</button>`;
				document.getElementById("reload").addEventListener("click",() => location.reload());
				
				socket.fatalError = true;
				socket.disconnect();
			}
		},

		home: () => {
			const main = document.querySelector("main");
			main.setAttribute("status","home");
			main.innerHTML = ``;
		},

		id: (id) => {
			document.querySelector("id").innerHTML = id || "";
		},

		ping: (ping) => {
			document.querySelector("ping").innerHTML = `${ping || ".."} ms`;
		}
	};


	socket.on("connect",() => {
		Display.home();
		Display.id(socket.id);
		Display.ping();
	});

	socket.on("disconnect",(reason) => {
		if (!socket.fatalError) {
			Display.errors.fatal(`Disconnected from server "${server}": ${reason}`);
		}

		Display.ping("xx");
	});

	socket.on("ask",(data,answer) => {
		console.log(`Server: Asking "${data}"`);

		switch (data) {
			case "version":
				answer(VERSION);
				break;
			
			default:
				answer();
				break;
		}
	});

	socket.on("ping",(ping,answer) => {
		Display.ping(ping);
		answer();
	});

	socket.on("connect_error",() => {
		Display.errors.fatal(`Server "${server}" unavailable`);
	});
});