import { io } from "https://cdn.socket.io/4.5.4/socket.io.esm.min.js";

const VERSION = "0.1.0";

const Storage = window.localStorage || window.sessionStorage || {
	data: {},

	getItem: (id) => Storage.data[id],
	setItem: (id,value) => Storage.data[id] = value
};



window.start = () => {
	const socket = io(location.hostname === "localhost" ? "ws://localhost:8080" : `${location.protocol === "https:" ? "wss" : "ws"}://${server}.ws.multy.wixonic.fr`,{
		path: "/",
		rememberUpgrade: true,
		timeout: 10000,
		transports: ["websocket"]
	});


	const Display = {
		errors: {
			fatal: (e="Unknown error") => {
				const main = document.querySelector("main");

				if (main.getAttribute("status") !== "fatal-error") {
					main.setAttribute("status","fatal-error");
					main.innerHTML = `<h1>Fatal error</h1><code>${e}</code><p>An error occured. Check your <b>internet connection</b>, and <b>reload</b> this page.</p><p>If it is recurrent, please <a href="mailto:contact@wixonic.fr?${encodeURI(`subject=[BUG] Fatal Error&body=Fatal Error Report\n\rID: ${socket.id || "Not connected"}\r\nMessage: ${e}\r\nDate: ${(new Date()).toISOString()}\r\nAdditional datas from user: `)}">report it</a>, or try to <b>change server</b>.</p><button id="reload">Reload page</button>`;
					document.getElementById("reload").addEventListener("click",() => location.reload());
				}
				
				socket.disconnect();
			}
		},


		home: () => {
			Display.currentDisplay = Display.home;

			const main = document.querySelector("main");
			main.setAttribute("status","home");
			main.innerHTML = "";
			
			const usernameInput = document.createElement("input");
			usernameInput.id = "username";
			usernameInput.setAttribute("autocomplete","off");
			usernameInput.setAttribute("type","text");
			usernameInput.setAttribute("placeholder","Username..");
			usernameInput.setAttribute("value",(Storage.getItem("username") || socket.id).split("&lt;").join("<").split("&gt;").join(">"));
			usernameInput.addEventListener("blur",() => {
				socket.emit("change-name",usernameInput.value,(username) => {
					Storage.setItem("username",username);
					usernameInput.value = username.split("&lt;").join("<").split("&gt;").join(">");
				});
			});
			main.append(usernameInput);

			const usernameEdit = document.createElement("icon");
			usernameEdit.id = "editUsername";
			usernameEdit.innerHTML = `<i class="fa-regular fa-pen"></i>`;
			main.append(usernameEdit);

			const roomSection = document.createElement("section");
			roomSection.id = "room";
			roomSection.innerHTML = "<h1>Room</h1>";

				const quickJoinButton = document.createElement("button");
				quickJoinButton.innerHTML = "Quick Play";
				quickJoinButton.addEventListener("click",() => {
					socket.emit("room-quick-join");
				});
				roomSection.append(quickJoinButton);

				const joinSectionButton = document.createElement("button");
				joinSectionButton.innerHTML = "Join";
				joinSectionButton.addEventListener("click",() => {
					roomSection.innerHTML = "<h1>Join Room</h1>";

					const backButton = document.createElement("button");
					backButton.innerHTML = "Back";
					backButton.addEventListener("click",Display.home);
					roomSection.append(backButton);

					const joinRoomInput = document.createElement("input");
					joinRoomInput.setAttribute("autocomplete","one-time-code");
					joinRoomInput.setAttribute("type","text");
					joinRoomInput.setAttribute("placeholder","Room code..");
					roomSection.append(joinRoomInput); 

					const joinRoomButton = document.createElement("button");
					joinRoomButton.innerHTML = "Join";
					joinRoomButton.addEventListener("click",() => {
						socket.emit("room-join",joinRoomInput.value,() => {
							alert("Room not available");
						});
					});
					roomSection.append(joinRoomButton);

					const joinRoomListRefresh = document.createElement("button");
					joinRoomListRefresh.innerHTML = "Refresh";
					joinRoomListRefresh.addEventListener("click",() => {
						socket.emit("rooms-get",(rooms) => {
							if (rooms.length <= 0) {
								joinRoomList.classList.add("empty");
								joinRoomList.innerHTML = "<special><b>No available room found.</b><br />Try refreshing the list, changing server or creating a room.</special>";
							} else {
								joinRoomList.classList.remove("empty");
								joinRoomList.innerHTML = "";

								rooms.sort((a,b) => b.usersCount - a.usersCount);
								rooms.forEach((room) => {
									room.el = document.createElement("room");
									room.el.innerHTML = `<id>${room.id}</id><count>${room.usersCount}/${socket.meta.rooms.maxUsersCount}</count>`;
									room.el.addEventListener("click",() => joinRoomInput.value = room.id);
									joinRoomList.append(room.el);
								});
							}
						});
					});
					roomSection.append(joinRoomListRefresh);

					const joinRoomList = document.createElement("list");
					roomSection.append(joinRoomList);

					joinRoomListRefresh.click();
				},{
					once: true
				});
				roomSection.append(joinSectionButton);

				const createSectionButton = document.createElement("button");
				createSectionButton.innerHTML = "Create";
				createSectionButton.addEventListener("click",() => {
					roomSection.innerHTML = "<h1>Create Room</h1>";

					const backButton = document.createElement("button");
					backButton.innerHTML = "Back";
					backButton.addEventListener("click",Display.home);
					roomSection.append(backButton);

					const createRoomInput = document.createElement("input");
					createRoomInput.setAttribute("autocomplete","off");
					createRoomInput.setAttribute("type","text");
					createRoomInput.setAttribute("placeholder","Room code..");
					createRoomInput.addEventListener("blur",() => {
						socket.emit("room-check-id",createRoomInput.value,(id) => createRoomInput.value = id);
					});
					roomSection.append(createRoomInput); 

					const createRoomButton = document.createElement("button");
					createRoomButton.innerHTML = "Create";
					createRoomButton.addEventListener("click",() => {
						socket.emit("room-create",createRoomInput.value);
					});
					roomSection.append(createRoomButton);

					socket.emit("room-generate-id",(id) => createRoomInput.value = id);
				},{
					once: true
				});
				roomSection.append(createSectionButton);

			main.append(roomSection);

			socket.emit("change-name",Storage.username,(username) => {
				Storage.username = username;
				usernameInput.value = username.split("&lt;").join("<").split("&gt;").join(">");
			});
		},

		message: (message) => {
			const messageContainer = document.querySelector("chat messages container");
			
			if (messageContainer) {
				messageContainer.innerHTML += `<message type="${message.type}" mode="${message.style}">${message.type === "user" ? `<author>${message.style === "owner" ? `<icon><i class="fa-regular fa-crown"></i></icon>` : ""}${message.author}</author>:` : ""}<content${message.type === "user" ? ` style="margin-left: 0.5rem;"` : ""}>${message.content}</content></message>`;
				messageContainer.parentElement.scrollTo(0,messageContainer.clientHeight);
			}
		},

		load: (w) => {
			Display.currentDisplay = () => Display.load(w);

			const main = document.querySelector("main");
			main.setAttribute("status","loading");
			main.innerHTML = "<loader></loader><text>Loading<dot>.</dot><dot>.</dot><dot>.</dot></text>";

			import(`./worlds/${w}/meta.js`)
			.then((worldMeta) => {
				main.innerHTML += `<world><name>${worldMeta.name}</name><description>${worldMeta.description}</description></world>`;

				import(`./worlds/${w}/run.js`)
				.then((run) => {
					window.world = run;

					console.log(world);
				}).catch(() => Display.errors.fatal("World datas not found"));
			}).catch(() => Display.errors.fatal("World metadatas not found"));
		},

		room: () => {
			Display.currentDisplay = Display.room;

			const main = document.querySelector("main");
			main.setAttribute("status","room");
			main.innerHTML = `<id>${socket.room.id}</id>`;

			const usersList = document.createElement("list");
			usersList.innerHTML = "Loading...";
			main.append(usersList);
			
			const roomChat = document.createElement("chat");

				const roomChatMessages = document.createElement("messages");
				roomChatMessages.innerHTML = "<container></container>";
				roomChat.append(roomChatMessages);

				const roomChatInput = document.createElement("input");
				roomChatInput.setAttribute("autocomplete","off");
				roomChatInput.setAttribute("type","text");
				roomChatInput.setAttribute("placeholder","Chat..");
				roomChatInput.addEventListener("keydown",(e) => {
					if (e.key === "Enter") {
						socket.emit("room-message",roomChatInput.value);
						roomChatInput.value = "";
					}
				});
				roomChat.append(roomChatInput);
			
			main.append(roomChat);
			
			Display.roomOwner(socket.room.users[0].id === socket.id);
			Display.roomUsers();
		},

		roomMode (mode) {
			if (document.querySelector("main options switch")) {
				document.querySelector("main options switch").classList.toggle("active",!mode);
			}
		},

		roomOwner (is) {
			const options = document.querySelector("main options") || document.createElement("options");
			options.innerHTML = "";

			if (!document.querySelector("main options")) {
				document.querySelector("main").append(options);
			}

			if (is) {
				const startButton = document.createElement("button");
				startButton.id = "start";
				startButton.innerHTML = `<i class="fa-solid fa-play"></i> Start`;
				startButton.addEventListener("click",() => {
					if (!startButton.classList.contains("disabled")) {
						startButton.classList.add("disabled");
						socket.emit("game-start",() => startButton.classList.remove("disabled"));
					}
				});
				options.append(startButton);
			}

			const modeSwitch = document.createElement("switch");
			modeSwitch.classList.toggle("active",socket.room.mode === "public");
			modeSwitch.innerHTML = "<item>Private</item><item>Public</item><cache></cache>";

			if (is) {
				modeSwitch.classList.add("canclick");
				modeSwitch.addEventListener("click",() => {
					if (!modeSwitch.classList.contains("disabled")) {
						modeSwitch.classList.add("disabled");
						socket.emit("room-change-mode",modeSwitch.classList.contains("active"),() => modeSwitch.classList.remove("disabled"));
					}
				});
			}

			options.append(modeSwitch);
		},

		roomUsers () {
			if (document.querySelector("main").getAttribute("status") === "room") {
				const container = document.querySelector("main list");
				container.innerHTML = "";

				for (let user of socket.room.users) {
					const userEl = document.createElement("user");
					userEl.id = user.id;
					userEl.setAttribute("owner",user.owner);
					userEl.innerHTML = `${user.owner ? `<icon><i class="fa-regular fa-crown"></i></icon>` : ""}<name>${user.name}</name>${socket.room.users[0].id === socket.id && user.id !== socket.id ? `<button class="kick">Kick</button>` : ""}${user.id !== socket.id ? `<ping>${user.ping} ms</ping>` : ""}`;
					container.append(userEl);
				}

				document.querySelectorAll("main list user button.kick").forEach((el) => {
					el.addEventListener("click",() => {
						socket.emit("room-kick",el.parentElement.id,() => {
							alert("Cannot kick user");
						});
					});
				});
			}
		},


		id: () => document.querySelector("id").innerHTML = socket.id || "",

		ping: () => document.querySelector("ping").innerHTML = `${socket.ping || ".."} ms`
	};



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


	socket.on("game-load",Display.load);


	socket.on("room",(room) => {
		socket.room = room;
		Display.room();
	});

	socket.on("room-kicked",(by) => {
		delete socket.room;
		Display.home();
		alert(`You got kicked by ${by}`);
	});

	socket.on("room-leaved",() => {
		delete socket.room;
		Display.home();
	});

	socket.on("room-mode-changed",Display.roomMode);

	socket.on("room-message",(message) => Display.message({
		author: message.author.name || message.author.id,
		content: message.content,
		style: message.style,
		type: message.author.id === socket.id ? "self" : "user"
	}));

	socket.on("room-owner",Display.roomOwner);

	socket.on("room-user-joined",(user) => Display.message({
		content: `${user} just joined`,
		style: "join",
		type: "system"
	}));

	socket.on("room-user-leaved",(user) => Display.message({
		content: `${user} just leaved`,
		style: "leave",
		type: "system"
	}));

	socket.on("room-user-kicked",(user,by) => Display.message({
		content: `${by} asked ${user} to leave (by force)`,
		style: "leave",
		type: "system"
	}));


	socket.on("meta",(meta) => socket.meta = meta);

	socket.on("ping",(ping,roomUsers,callback) => {
		socket.ping = ping;
		Display.ping();

		if (socket.room && roomUsers) {
			socket.room.users = roomUsers;
			Display.roomUsers();
		}

		callback();
	});


	socket.once("connect",() => {
		Display.home();
		Display.id();
	});

	socket.io.on("reconnect",() => {
		Display.id();
		Display.ping();
		
		Display[Display.currentDisplay]();
	});

	socket.io.on("reconnect_attempt",reset);
	socket.io.on("reconnect_failed",(reason) => Display.errors.fatal(`Disconnected from server "${server}": ${reason.message}`));
	socket.on("disconnect",(reason) => Display.errors.fatal(`Disconnected from server "${server}": ${reason}`));
	socket.on("connect_error",() => Display.errors.fatal(`Server "${server}" unavailable`));
};