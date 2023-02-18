const initialDatas = () => {
	return {
		DOM: {
			main: null,
			bomb: document.createElement("bomb"),
			wires: document.createElement("wires"),
			keypad: document.createElement("keypad"),
			timerContainer: document.createElement("timercontainer"),
			timer: document.createElement("timer"),
			bigBtn: document.createElement("bigbutton"),
			LEDs: [],
			middleLED: document.createElement("led"),
			manual: document.createElement("manual")
		},

		startTimestamp: 0,
		endTimestamp: 0,

		endScreen: false,
		startTimeout: null,
		toLobby: null
	};
};

let datas;

export const load = async () => {
	datas = initialDatas();

	datas.DOM.manual.iframe = document.createElement("iframe");
	datas.DOM.manual.iframe.innerHTML = "Loading...";
	datas.DOM.manual.iframe.src = "/worlds/defuse/";
	datas.DOM.manual.append(datas.DOM.manual.iframe);
};

export const setup = (main) => {
	datas.DOM.main = main;
	datas.DOM.main.innerHTML = "";

	datas.DOM.timer.innerHTML = `<span style="opacity: 0.1">88:88</span>`;
	datas.DOM.timerContainer.append(datas.DOM.timer);

	for (let x = 0; x < 9; ++x) {
		datas.DOM.LEDs[x] = document.createElement("led");
		const off = 1250 + (x < 6 ? x % 3 : 2 - x % 3) * 250;
		datas.DOM.LEDs[x].led = document.createElement("led");
		datas.DOM.LEDs[x].led.animation = datas.DOM.LEDs[x].led.animate({
			background: ["#200","#FF0600","#200"],
			offset: [off / 2000,(off + 125) / 2000,(off + 250) / 2000]
		},{
			duration: 2000,
			iterations: Infinity
		});
		datas.DOM.LEDs[x].led.animation.pause();
		datas.DOM.LEDs[x].append(datas.DOM.LEDs[x].led);
		datas.DOM.bomb.append(datas.DOM.LEDs[x]);
	}

	datas.DOM.middleLED.innerHTML = "";
	datas.DOM.middleLED.classList.add("middle");
	datas.DOM.middleLED.led = document.createElement("led");
	datas.DOM.middleLED.led.animation = datas.DOM.middleLED.led.animate({
		background: ["#FF0600","#200"],
		offset: [0.0625,0.125]
	},{
		duration: 2000,
		iterations: Infinity
	});
	datas.DOM.middleLED.led.animation.pause();
	datas.DOM.middleLED.append(datas.DOM.middleLED.led);

	datas.DOM.manual.button = document.createElement("button");
	datas.DOM.manual.button.innerHTML = `<icon><i class="fa-solid fa-caret-right"></i></icon>`;
	datas.DOM.manual.button.addEventListener("click",() => datas.DOM.manual.classList.toggle("open"));
	datas.DOM.manual.append(datas.DOM.manual.button);

	datas.DOM.bomb.append(datas.DOM.wires,datas.DOM.keypad,datas.DOM.timerContainer,datas.DOM.bigBtn,datas.DOM.middleLED,datas.DOM.manual);

	datas.DOM.main.append(datas.DOM.bomb);
};

export const run = (toLobby) => {
	datas.toLobby = toLobby;

	socket.once("game-datas",(initialD) => {
		datas.startTimestamp = initialD.start;
		datas.endTimestamp = initialD.end;

		datas.startTimeout = setTimeout(start,initialD.start - Date.now());

		update();

		socket.on("game-datas",(d) => {
			console.log(d);
		});
	});

	socket.once("game-trial",(d) => {
		datas.DOM.bomb.setAttribute("color",d.bomb.color);

		for (let x = 0; x < d.wires.count; ++x) {
			const wire = document.createElement("wire");
			wire.setAttribute("type",d.wires.types[x]);
			wire.addEventListener("click",() => {
				if (!wire.classList.contains("clicked")) {
					socket.emit("game-check","wires",x,(valid) => {
						if (valid && datas.DOM.LEDs) {
							for (let x = 3; x < 6; ++x) {
								datas.DOM.LEDs[x].led.animation.pause();
							}

							datas.DOM.wires.classList.add("done");
						}
					});

					wire.classList.add("clicked");
				}
			});
			datas.DOM.wires.append(wire);
		}

		console.log(d);
	});

	socket.once("game-boom",() => {
		datas.DOM.main.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 1;"></div>`;
		setTimeout(() => {
			if (datas.ended) {
				end();
			} else {
				endScreen();
			}
		},2000);
	});
	socket.once("game-end-screen",endScreen);
	socket.once("game-end",end);
};

const start = () => {
	datas.DOM.LEDs.forEach((LED) => LED.led.animation.play());
	datas.DOM.middleLED.led.animation.play();
};

const update = () => {
	if (Date.now() < datas.endTimestamp && !datas.endScreen) {
		if (Date.now() > datas.startTimestamp) {
			datas.DOM.timer.innerHTML = `<span>${(Math.floor((datas.endTimestamp - Date.now()) / 1000 / 60 % 60) * 0.1).toFixed(1).replace(".","")}</span><span style="opacity: ${(datas.endTimestamp - Date.now()) % 1000 < 500 ? "1" : "0.1"}">:</span>${(Math.floor((datas.endTimestamp - Date.now()) / 1000 % 60) * 0.1).toFixed(1).replace(".","")}</span>`;
		}
		
		requestAnimationFrame(update);
	}
};

const endScreen = () => {
	datas.endScreen = true;

	clearTimeout(datas.startTimeout);
	
	datas = {
		DOM: {
			main: datas.DOM.main,
			lobby: document.createElement("button")
		},

		endScreen: true,
		toLobby: datas.toLobby,
		toLobbyTimeout: null
	};

	datas.DOM.main.innerHTML = "";

	datas.DOM.lobby.innerHTML = "Lobby";
	datas.DOM.lobby.style.cssText = "display: none";
	datas.DOM.lobby.addEventListener("click",() => {
		clearTimeout(datas.toLobbyTimeout);
		datas.toLobby();
	});
	
	datas.DOM.main.append(datas.DOM.lobby);
};

const end = () => {
	datas.ended = true;

	if (!datas.endScreen) {
		endScreen();
	}

	datas.DOM.lobby.style.display = "block";
	datas.toLobbyTimeout = setTimeout(datas.toLobby,20000);

	socket.off("game-boom");
	socket.off("game-datas");
	socket.off("game-end-screen");
	socket.off("game-end");
	socket.off("game-trial");
};