class World {
	static list = ["defuse"];

	constructor (id="unknow") {
		this.id = id;
	};
};

World.defuse = class defuse extends World {
	constructor () {
		super("defuse");

		this.id = "defuse";
	};

	async start (datas) {
		this.database = {
			start: Date.now() + 5000,
			end: 0,
	
			scores: {}
		};

		this.database.end = this.database.start + 120000;
	
		this.private = {
			endTimeout: null
		};
	
		const sockets = await datas.sockets;
	
		let end = () => {
			end = new Function();

			for (let socket of sockets) {
				if (this.database.scores[socket.id].finished) {
					socket.emit("game-end");
				} else {
					this.database.scores[socket.id].lifes = 0;
					socket.emit("game-boom");
					socket.removeAllListeners("game-check");
				}
			}
			
			this.end();
		};
	
		for (let socket of sockets) {
			this.database.scores[socket.id] = {
				finished: false,
				lifes: 2,
				progress: 0,
				name: socket.name || "Player"
			};

			console.log(this.database.scores[socket.id]);
	
			this.private[socket.id] = {
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
	
			for (let x = 0; x < this.private[socket.id].wires.count; ++x) {
				this.private[socket.id].wires.types[x] = Math.floor(Math.random() * 3);
			}
	
			const bombColor = this.private[socket.id].bomb.color;
			const buttonColor = this.private[socket.id].button.color;
			const buttonText = this.private[socket.id].button.text;
			const wiresCount = this.private[socket.id].wires.count;
			const wiresTypes = this.private[socket.id].wires.types;
	
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
	
			this.private[socket.id].button.answer = ["short","long"][buttonAnswer];
			this.private[socket.id].keypad.answer = keypadAnswer;
			this.private[socket.id].wires.answer = wiresAnswer;
	
	
			socket.emit("game-trial",{
				bomb: {
					color: bombColor
				},
	
				button: {
					color: buttonColor,
					text: buttonText
				},
	
				keypad: {
					number: this.private[socket.id].keypad.number
				},
	
				wires: {
					count: wiresCount,
					types: wiresTypes
				}
			});
	
			socket.on("game-check",(type,value,callback) => {
				const valid = this.private[socket.id][type].answer === value;

				if (valid) {
					this.database.scores[socket.id].progress++;
				} else {
					this.database.scores[socket.id].lifes--;
				}

				console.log(this.database.scores[socket.id]);
	
				// if (this.database.scores[socket.id].progress === 3) {
				if (this.database.scores[socket.id].progress === 1) {
					this.database.scores[socket.id].finished = this.database.end - Date.now();
					socket.emit("game-end-screen");
				} else if (this.database.scores[socket.id].lifes <= 0) {
					socket.emit("game-boom");
				}
	
				let gameFinished = true;
				for (let id in this.database.scores) {
					gameFinished &= this.database.scores[id].finished !== false || this.database.scores[id].lifes <= 0;
				}
	
				if (gameFinished) {
					clearInterval(this.private.endTimeout);
					end();
				}
	
				datas.broadcast.emit("game-datas",this.database);
	
				callback(valid);
			});
		}
	
		this.private.endTimeout = setTimeout(end,this.database.end - Date.now());
		datas.broadcast.emit("game-datas",this.database);
	}
};

exports.World = () => new World[World.list[Math.floor(Math.random() * World.list.length)]]();