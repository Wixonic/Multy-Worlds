const VERSION = "0.1.0";

let server = "beta";

try {
	const searchParams = new URLSearchParams(location.search);
	server = searchParams.get("server");

	if (!["beta"].includes(server)) {
		server = "beta";
	}
} catch {}
server = location.hostname === "localhost" ? "local" : server;
history.pushState(null,"",`${location.protocol}//${location.host}${location.pathname}?server=${server}`);

const Storage = window.localStorage || window.sessionStorage || {};

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
			main.innerHTML = "";

			const usernameInput = document.createElement("input");
			usernameInput.setAttribute("type","text");
			usernameInput.setAttribute("placeholder","Username..");
			usernameInput.setAttribute("value",Storage.username.split("&lt;").join("<").split("&gt;").join(">"));
			usernameInput.addEventListener("blur",() => {
				socket.emit("change-name",usernameInput.value,(username) => {
					Storage.username = username;
					usernameInput.value = username.split("&lt;").join("<").split("&gt;").join(">");
				});
			});
			main.append(usernameInput);

			socket.emit("change-name",Storage.username,(username) => {
				Storage.username = username;
				usernameInput.value = username.split("&lt;").join("<").split("&gt;").join(">");
			});
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