const Version = "0.0.1";

let server = "eu";
try {
	const searchParams = new URLSearchParams(location.search);
	server = searchParams.get("server") || server;

	switch (server) {
		case "eu":
			break;
		
		case "us":
			break;
		
		case "as":
			break;
		
		case "au":
			break;

		default:
			server = "eu";
			break;
	}
} catch {}
server = location.hostname === "localhost" ? "local" : server;
history.pushState(null,"",`${location.protocol}//${location.host}${location.pathname}?server=${server}`);
const ws = new WebSocket(location.hostname === "localhost" ? "ws://localhost:8080" : `${location.protocol === "https:" ? "wss:" : "ws"}://${location.host}/ws/${server}`);

window._wsStatus = 0;
window._currentDisplay = "home";

const Send = (type,datas={}) => {
	datas.type = type;
	ws.send(JSON.stringify(datas));
};

ws.addEventListener("close",(e) => {
	switch (e.code) {
		case 1006:
			if (_wsStatus == 1) {
				console.error("Disconnected due to an error");
			} else if (_wsStatus == 0) {
				console.error("Server unavailable");
			}
			break;
		
		default:
			console.error(`Disconnected: ${e.reason} (${e.code})`);
			setTimeout(() => open("/","_self"),1000);
			break;
	}

	document.querySelector("ping").innerHTML = "?? ms";
});


const Display = {
	home: () => {
		_currentDisplay = "home";

		document.querySelector("main").innerHTML = `<input type="text" class="username" placeholder="Username.." value="${user.name}" /><button class="create">Create</button><button class="join">Join</button>`;
		
		document.querySelector(".username").addEventListener("blur",() => {
			Send("username",{
				name: document.querySelector(".username").value
			});
		});

		document.querySelector(".create").addEventListener("click",() => {
			Send("room-create");
		});

		document.querySelector(".join").addEventListener("click",() => {
			_currentDisplay = "join";

			document.querySelector("main").innerHTML = `<input type="text" class="code" placeholder="Room code.." /><button class="join">Join</button>`;

			document.querySelector(".join").addEventListener("click",() => {
				Send("room-join",{
					code: document.querySelector(".code").value
				});
			});
		},{
			once: true
		});
	},

	load: () => {
		_currentDisplay = "load";

		document.querySelector("main").innerHTML = room.world.name;
	},

	room: () => {
		let list = "";

		for (let u of room.list) {
			list += `<user id="${u.id}"><name>${u.name}</name>${room.owner === u.id ? `<tag type="host">Host</tag>` : ""}${u.id !== user.id ? `<ping>${u.ping}</ping>` : "" }${room.owner === user.id && u.id !== user.id ? `<button class="kick">Kick</button>` : ""}</user>`
		}

		if (_currentDisplay === "room") {
			document.querySelector("list").innerHTML = list;
		} else {
			_currentDisplay = "room";
			
			document.querySelector("main").innerHTML = `<input class="id" type="text" value="${room.id}" />${room.owner === user.id ? `<button class="start">Start</button>` : ""}<list>${list}</list>`;
			
			document.querySelector(".id").addEventListener("input",() => document.querySelector(".id").value = room.id);

			if (room.owner === user.id) {
				document.querySelector(".start").addEventListener("click",() => {
					Send("room-start");
				});
			}
		}

		if (room.owner === user.id) {
			document.querySelectorAll(".kick").forEach((el) => {
				el.addEventListener("click",() => {
					Send("kick",{
						id: el.parentElement.getAttribute("id")
					});
				});
			});
		}
	}
};


ws.addEventListener("message",(e) => {
	const message = JSON.parse(e.data);

	switch (message.type) {
		case "checked":
			window.user = message.me;
			Display.home();
			break;
		
		case "invalid-code":
			Display.home();
			console.error("Invalid code");
			break;
		
		case "me":
			window.user = message.me;

			if (document.querySelector(".username")) {
				document.querySelector(".username").value = user.name;
			}
			break;

		case "ping":
			document.querySelector("ping").innerHTML = `${message.ping} ms`;
			
			if (message.room && _currentDisplay === "room") {
				window.room = message.room;
				Display.room();
			}

			Send("ping");
			break;
		
		case "kicked":
			Display.home();
			console.error("You were kicked by",message.by.id);
			break;
		

		case "room-changed":
			window.room = message.room;
			Display.room();
			console.log(room.id,"changed");
			break;
		
		case "room-closed":
			Display.home();
			console.warn(room.id,"closed");
			break;

		case "room-created":
			window.room = message.room;
			Display.room();
			console.info(room.id,"created");
			break;
		
		case "room-loading":
			window.room.world = message.world;
			Display.load();
			break;
		
		case "room-joined":
			window.room = message.room;
			Display.room();
			console.info(room.id,"joined");
			break;
		
		case "room-leaved":
			Display.home();
			console.info(room.id,"leaved");
			break;
		

		case "user-joined":
			console.log(message.user.id,"joined");
			break;
		
		case "user-kicked":
			console.warn("User",message.user.id,"kicked by",message.by.id);
			break;
	
		case "user-leaved":
			console.log(message.user.id,"leaved");
			break;

		default:
			console.error(`Unsupported request "${message.type}"`);
			ws.close();
			break;
	};
});

ws.addEventListener("open",() => {
	_wsStatus = 1;
	Send("check",{
		version: Version
	});
});