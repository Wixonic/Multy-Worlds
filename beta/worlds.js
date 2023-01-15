const Worlds = {
	_list: ["defuse"],

	"defuse": {
		id: "defuse",
		start: async (datas) => {
			const database = {
				start: Date.now() + 5000,
				end: 0,

				scores: {}
			};

			const private = {};

			database.end = database.start + 120000;

			const sockets = await datas.sockets;

			sockets.forEach((socket) => {
				database.scores[socket.id] = {
					finished: false,
					lifes: 2,
					progress: 0,
					name: socket.name
				};

				private[socket.id] = {
					bomb: {
						color: ["black","white","blue","red"][Math.floor(Math.random() * 4)]
					},

					wires: {
						answer: [],
						count: Math.round(Math.random() + 3),
						types: []
					}
				};

				for (let x = 0; x < private[socket.id].wires.count; ++x) {
					private[socket.id].wires.types[x] = Math.floor(Math.random() * 3);
				}

				const types = private[socket.id].wires.types;
				let answer;
				if (private[socket.id].wires.count === 3) {
					if (private[socket.id].bomb.color === "white" || private[socket.id].bomb.color === "red") {
						switch (true) {
							case types[0] == 2 && types[2] != 1:
								answer = 1;
								break;
							
							case types[0] == 0 && types[1] != 2:
								answer = 0;
								break;
							
							case types[1] == 1:
								answer = 1;
								break;
							
							case types[2] == 2:
								answer = 2;
								break;
							
							default:
								answer = 0;
								break;
						}
					} else {
						switch (true) {
							case types[0] == 1 && types[2] != 1:
								answer = 2;
								break;
							
							case types[0] == 2 && types[2] != 0:
								answer = 1;
								break;

							case types[1] == 2:
								answer = 2;
								break;
							
							case types[1] != 1:
								answer = 1;
								break;
							
							default:
								answer = 0;
								break;
						}
					}
				} else {
					if (private[socket.id].bomb.color === "white" || private[socket.id].bomb.color === "red") {
						switch (true) {
							case types[1] == 2 && types[3] != 1:
								answer = 1;
								break;
							
							case types[1] != 1 && types[2] == 2:
								answer = 0;
								break;
							
							case types[0] == 0:
								answer = 3;
								break;
							
							case types[1] != 2:
								answer = 2;
								break;
							
							default:
								answer = 3;
								break;
						}
					} else {
						switch (true) {
							case types[1] == 1 && types[2] != 1:
								answer = 0;
								break;
							
							case types[0] == 2 && types[1] != 0:
								answer = 3;
								break;
							
							case types[3] != 2:
								answer = 1;
								break;
							
							case types[0] == 1:
								answer = 0;
								break;
							
							default:
								answer = 2;
								break;
						}
					}
				}

				private[socket.id].wires.answer = answer.toString();

				socket.emit("game-trial",{
					bomb: {
						color: private[socket.id].bomb.color
					},

					wires: {
						count: private[socket.id].wires.count,
						types: private[socket.id].wires.types
					}
				});

				socket.on("game-check",(type,value,callback) => {
					let valid;
					switch (type) {
						case "wires":
							valid = value == private[socket.id].wires.answer;
							break;
					}

					if (!valid) {
						database.scores[socket.id].lifes--;
					}

					if (database.scores[socket.id].lifes <= 0) {
						socket.emit("game-boom");
						datas.broadcast.except(socket.id).emit("game-boom-for",socket.id);
					}

					datas.broadcast.emit("game-datas",database);

					callback(valid);
				});
			});

			setTimeout(() => {
				datas.broadcast.emit("game-end",database.scores);

				sockets.forEach((socket) => {
					socket.removeAllListeners("game-end");
				});
			},database.end - Date.now());

			datas.broadcast.emit("game-datas",database);
		}
	}
};

exports.World = () => Worlds[Worlds._list[Math.floor(Math.random() * Worlds._list.length)]];