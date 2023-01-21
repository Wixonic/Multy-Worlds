const Worlds = {
	_list: ["defuse"],

	"defuse": {
		id: "defuse",
		start: async (datas,endWorld) => {
			const database = {
				start: Date.now() + 5000,
				end: 0,

				scores: {}
			};

			const private = {
				endTimeout: null
			};

			database.end = database.start + 120000;

			const sockets = await datas.sockets;

			const end = () => {
				for (let socket of sockets) {
					if (database.scores[socket.id].finished) {
						socket.emit("game-end");
					} else {
						database.scores[socket.id].lifes = 0;
						socket.emit("game-boom");
						socket.removeAllListeners("game-check");
					}
				}
				
				endWorld();
			};

			for (let socket of sockets) {
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

					button: {
						answer: null,
						color: ["black","white","blue","red","green","yellow"][Math.floor(Math.random() * 6)],
						text: ["Boom","Defuse","Push"][Math.floor(Math.random() * 3)]
					},

					keypad: {
						answer: null,
						number: Math.floor(Math.random() * 10)
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

				const bombColor = private[socket.id].bomb.color;
				const buttonColor = private[socket.id].button.color;
				const buttonText = private[socket.id].button.text;
				const wiresCount = private[socket.id].wires.count;
				const wiresTypes = private[socket.id].wires.types;

				let buttonAnswer, keypadAnswer, wiresAnswer;

				switch (buttonColor) {
					case "black":
						switch (buttonText) {
							case "Boom":
								buttonAnswer = 0;
								break;

							case "Defuse":
								buttonAnswer = 1;
								break;
							
							case "Push":
								buttonAnswer = 0;
								break;
						}
						break;
					
					case "white":
						switch (buttonText) {
							case "Boom":
								buttonAnswer = 1;
								break;

							case "Defuse":
								buttonAnswer = 1;
								break;
							
							case "Push":
								buttonAnswer = 0;
								break;
						}
						break;
					
					case "blue":
						switch (buttonText) {
							case "Boom":
								buttonAnswer = 0;
								break;

							case "Defuse":
								buttonAnswer = 0;
								break;
							
							case "Push":
								buttonAnswer = 1;
								break;
						}
						break;
					
					case "red":
						switch (buttonText) {
							case "Boom":
								buttonAnswer = 1;
								break;

							case "Defuse":
								buttonAnswer = 0;
								break;
							
							case "Push":
								buttonAnswer = 1;
								break;
						}
						break;
					
					case "green":
						switch (buttonText) {
							case "Boom":
								buttonAnswer = 0;
								break;

							case "Defuse":
								buttonAnswer = 1;
								break;
							
							case "Push":
								buttonAnswer = 1;
								break;
						}
						break;
					
					case "yellow":
						switch (buttonText) {
							case "Boom":
								buttonAnswer = 1;
								break;

							case "Defuse":
								buttonAnswer = 0;
								break;
							
							case "Push":
								buttonAnswer = 0;
								break;
						}
						break;
				}
				
				if (wiresCount === 3) {
					if (bombColor === "white" || bombColor === "red") {
						switch (true) {
							case wiresTypes[0] == 2 && wiresTypes[2] != 1:
								wiresAnswer = 1;
								break;
							
							case wiresTypes[0] == 0 && wiresTypes[1] != 2:
								wiresAnswer = 0;
								break;
							
							case wiresTypes[1] == 1:
								wiresAnswer = 1;
								break;
							
							case wiresTypes[2] == 2:
								wiresAnswer = 2;
								break;
							
							default:
								wiresAnswer = 0;
								break;
						}
					} else {
						switch (true) {
							case wiresTypes[0] == 1 && wiresTypes[2] != 1:
								wiresAnswer = 2;
								break;
							
							case wiresTypes[0] == 2 && wiresTypes[2] != 0:
								wiresAnswer = 1;
								break;

							case wiresTypes[1] == 2:
								wiresAnswer = 2;
								break;
							
							case wiresTypes[1] != 1:
								wiresAnswer = 1;
								break;
							
							default:
								wiresAnswer = 0;
								break;
						}
					}
				} else {
					if (bombColor === "white" || bombColor === "red") {
						switch (true) {
							case wiresTypes[1] == 2 && wiresTypes[3] != 1:
								wiresAnswer = 1;
								break;
							
							case wiresTypes[1] != 1 && wiresTypes[2] == 2:
								wiresAnswer = 0;
								break;
							
							case wiresTypes[0] == 0:
								wiresAnswer = 3;
								break;
							
							case wiresTypes[1] != 2:
								wiresAnswer = 2;
								break;
							
							default:
								wiresAnswer = 3;
								break;
						}
					} else {
						switch (true) {
							case wiresTypes[1] == 1 && wiresTypes[2] != 1:
								wiresAnswer = 0;
								break;
							
							case wiresTypes[0] == 2 && wiresTypes[1] != 0:
								wiresAnswer = 3;
								break;
							
							case wiresTypes[3] != 2:
								wiresAnswer = 1;
								break;
							
							case wiresTypes[0] == 1:
								wiresAnswer = 0;
								break;
							
							default:
								wiresAnswer = 2;
								break;
						}
					}
				}

				private[socket.id].button.answer = ["short","long"][buttonAnswer];
				private[socket.id].keypad.answer = keypadAnswer;
				private[socket.id].wires.answer = wiresAnswer;


				socket.emit("game-trial",{
					bomb: {
						color: bombColor
					},

					button: {
						color: buttonColor,
						text: buttonText
					},

					keypad: {
						number: private[socket.id].keypad.number
					},

					wires: {
						count: wiresCount,
						types: wiresTypes
					}
				});

				socket.on("game-check",(type,value,callback) => {
					let valid;
					switch (type) {
						case "button":
							valid = value == private[socket.id].button.answer;
							break;
						
						case "keypad":
							valid = value == private[socket.id].keypad.answer;
							break;
						
						case "wires":
							valid = value == private[socket.id].wires.answer;
							break;
					}

					if (valid) {
						database.scores[socket.id].progress++;
					} else {
						database.scores[socket.id].lifes--;
					}

					// if (database.scores[socket.id].progress === 3) {
					if (database.scores[socket.id].progress === 1) {
						database.scores[socket.id].finished = database.end - Date.now();
						socket.emit("game-end-screen");
					}

					if (database.scores[socket.id].lifes <= 0) {
						socket.emit("game-boom");
					}

					let gameFinished = true;
					for (let id in database.scores) {
						gameFinished = gameFinished && (database.scores[id].finished || database.scores[id].lifes <= 0);
					}

					if (gameFinished) {
						clearInterval(database.endTimeout);
						end();
					}

					datas.broadcast.emit("game-datas",database);

					callback(valid);
				});
			}

			private.endTimeout = setTimeout(end,database.end - Date.now());
			datas.broadcast.emit("game-datas",database);
		}
	}
};

exports.World = () => Worlds[Worlds._list[Math.floor(Math.random() * Worlds._list.length)]];