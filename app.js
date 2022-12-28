const Core = require("./core.js");

Core.wss.on("close",(e) => {
	console.error(`Server: closed -  ${e.reason} (${e.code})`);
});

Core.wss.on("connection",(ws,ip) => {
	const user = new Core.user(ws,ip);

	console.info(`${user.name} (${user.id}): Connection open`);

	ws.on("close",(e) => {
		if (user.room instanceof Core.room) {
			if (user.id !== user.room.owner) {
				const index = user.room.list.indexOf(user);
				
				if (index >= 0) {
					user.room.list.splice(index,1);

					for (let u of user.room.list) {
						u.send("user-leaved",{
							user: user.export()
						});
					}

					if (user.room.status === "playing" && user.room.world.usersNeeded < user.room.list.length) {
						user.room.world.close();
					}
				}
			} else {
				for (let u of user.room.list) {
					u.send("room-closed");
					delete Core.room.list[u.room.id];
					delete u.room;
				}
			}
		}

		delete user;
		delete Core.user.list[user.id];

		console.log(`${user.name} (${user.id}): Connection closed (${e})`);
	});

	ws.on("message",(message) => {
		try {
			message = JSON.parse(message.toString("utf-8"));
		} catch {
			console.error(`${user.name} (${user.id}): Invalid message content`);
			ws.close(1007,"Invalid message content");
		}

		switch (message.type) {
			case "check":
				user.version = message.version;

				if (user.valid()) {
					user.send("checked",{
						me: user.export(true)
					});
				} else {
					ws.close(1003,"Unsupported version");
					console.error(`${user.name} (${user.id}): Invalid version (${user.version}), expected ${Core.version}`)
				}
				break;
			
			case "kick":
				const kicked = Core.user.get(message.id);

				if (user.room instanceof Core.room && user.room.owner === user.id && kicked instanceof Core.user && kicked.id !== user.room.owner) {
					const index = user.room.list.indexOf(kicked);
					
					if (index >= 0) {
						user.room.list.splice(index,1);

						for (let u of user.room.list) {
							u.send("user-kicked",{
								by: user.export(),
								user: kicked.export()
							});
						}

						kicked.send("kicked",{
							by: user.export()
						});

						console.info(`${user.name} (${user.id}): Kicked "${kicked.name}" (${kicked.id}) from room "${user.room.id}"`);
					} else {
						console.error(`${user.name} (${user.id}): Cannot kick "${kicked.name}" (${kicked.id}) from room "${user.room.id}" - user not in room`);
					}
				} else {
					console.warn(`${user.name} (${user.id}): Missing permissions to kick`);
					user.send("missing-permissions");
				}
				break;

			case "ping":
				if (user.timeout) {
					clearTimeout(user.timeout);
				}

				user._pingEnd = performance.now();
				user.ping = Math.round(user._pingEnd - user._pingStart);
				break;
			
			case "room-create":
				user.room = new Core.room(user);
				user.send("room-created",{
					room: user.room.export()
				});

				console.info(`${user.name} (${user.id}): Created room "${user.room.id}"`);
				break;
			
			case "room-join":
				user.room = Core.room.get(message.code);

				if (user.room instanceof Core.room) {
					user.room.list.push(user);

					user.send("room-joined",{
						room: user.room.export()
					});

					for (let u of user.room.list) {
						if (u.id !== user.id) {
							u.send("user-joined",{
								user: user.export()
							});

							u.send("room-changed",{
								room: user.room.export()
							});
						}
					}
	
					console.info(`${user.name} (${user.id}): Joined room "${user.room.id}"`);
				} else {
					user.send("invalid-code");
					console.error(`${user.name} (${user.id}): Invalid room code`);
				}
				break;
			
			case "room-start":
				if (user.room instanceof Core.room && user.room.owner === user.id && user.room.status !== "waiting") {
					user.room.status = "playing";
					user.room.world = new Core.worlds[Math.floor(Math.random() * Core.worlds.length)](user.room.id);
					
					for (let u of user.room.list) {
						u.send("room-loading",{
							world: user.room.world.export()
						});
					}

					console.info(`${user.name} (${user.id}): Started room "${user.room.id}"`);
				} else {
					console.warn(`${user.name} (${user.id}): Missing permissions to start room "${user.room.id}"`);
					user.send("missing-permissions");
				}
				break;
			
			case "username":
				if (message.name.length >= 3) {
					for (let char of Core.forbiddenChars) {
						message.name = message.name.split(char).join("-");
					}

					console.log(`${user.name} (${user.id}): Changed name (${message.name})`);
					user.name = message.name;
				}

				user.send("me",{
					me: user.export(true)
				});
				break;
			
			default:
				console.error(`${user.name} (${user.id}): Unsupported request "${message.type}"`);
				ws.close(1003,`Unsupported request "${message.type}"`);
				break;
		}
	});

	const ping = () => {
		if (user._pingEnd == undefined && !user.timeout) {
			user.timeout = setTimeout(() => ws.close(1001,"Connection lost"),10000);
		} else if (ws.readyState === ws.OPEN) {
			delete user._pingEnd;
			user._pingStart = performance.now();
			user.send("ping",{
				ping: user.ping,
				room: user.room ? user.room.export() : null
			});

			setTimeout(ping,1000);
		}
	};

	ping();
});

Core.server.on("listening",() => {
	console.info("Server: listening");
});