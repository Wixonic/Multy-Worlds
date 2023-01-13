const Worlds = {
	_list: ["defuse"],

	"defuse": {
		id: "defuse",
		start: async (datas) => {
			const database = {
				start: Date.now() + 10000,
				end: Date.now() + 130000,
				scores: {}
			};

			const sockets = await datas.sockets;

			sockets.forEach((socket) => {
				database.scores[socket.id] = {
					lifes: 2
				};

				socket.on("game-end",() => {
					database.scores[socket.id] = Date.now();
					datas.broadcast.emit("game-end-for",socket.id);
				});
			});

			setTimeout(() => {
				datas.broadcast.emit("game-end",{
					scores: datas.scores
				});
			},database.end - Date.now());

			datas.broadcast.emit("game-datas",database);
		}
	}
};

exports.World = () => Worlds[Worlds._list[Math.floor(Math.random() * Worlds._list.length)]];