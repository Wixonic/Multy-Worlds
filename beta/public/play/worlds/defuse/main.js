const datas = {
	DOM: {
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
	endTimestamp: 0
};

export const load = async () => {
	datas.DOM.manual.iframe = document.createElement("iframe");
	datas.DOM.manual.iframe.innerHTML = "Loading...";
	datas.DOM.manual.iframe.src = "/worlds/defuse/";
	datas.DOM.manual.append(datas.DOM.manual.iframe);
};

export const setup = (main) => {
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
	datas.DOM.bomb.append(datas.DOM.wires,datas.DOM.keypad,datas.DOM.timerContainer,datas.DOM.bigBtn,datas.DOM.middleLED);

	datas.DOM.manual.button = document.createElement("button");
	datas.DOM.manual.button.innerHTML = `<icon><i class="fa-solid fa-caret-right"></i></icon>`;
	datas.DOM.manual.button.addEventListener("click",() => datas.DOM.manual.classList.toggle("open"));
	datas.DOM.manual.append(datas.DOM.manual.button);

	datas.DOM.bomb.append(datas.DOM.manual);

	main.append(datas.DOM.bomb);
};

export const run = () => {
	socket.once("game-datas",(initialD) => {
		datas.startTimestamp = initialD.start;
		datas.endTimestamp = initialD.end;

		setTimeout(start,initialD.start - Date.now());

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
						if (valid) {
							for (let x = 3; x < 6; ++x) {
								datas.DOM.LEDs[x].led.animation.pause();
							}

							datas.DOM.wires.classList.remove("active");
							datas.DOM.keypad.classList.add("active");
						}
					});

					wire.classList.add("clicked");
				}
			});
			datas.DOM.wires.append(wire);
		}

		console.log(d);

		datas.DOM.bomb.classList.add("active");
		datas.DOM.wires.classList.add("active");
	});

	socket.once("game-end",end);

	socket.on("game-end-for",(name) => {
		console.log(name,"ended!");
	});
};

const start = () => {
	datas.DOM.LEDs.forEach((LED) => LED.led.animation.play());
	datas.DOM.middleLED.led.animation.play();
};

const update = () => {
	if (Date.now() < datas.endTimestamp) {
		if (Date.now() > datas.startTimestamp) {
			datas.DOM.timer.innerHTML = `<span>${(Math.floor((datas.endTimestamp - Date.now()) / 1000 / 60 % 60) * 0.1).toFixed(1).replace(".","")}</span><span style="opacity: ${(datas.endTimestamp - Date.now()) % 1000 < 500 ? "1" : "0.1"}">:</span>${(Math.floor((datas.endTimestamp - Date.now()) / 1000 % 60) * 0.1).toFixed(1).replace(".","")}</span>`;
		}
		
		requestAnimationFrame(update);
	}
};

const end = (scores) => {
	console.log("Game ended,",scores);

	socket.off("game-datas");
	socket.off("game-end-for");
};