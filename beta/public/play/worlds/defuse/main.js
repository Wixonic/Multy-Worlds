const datas = {
	endTimestamp: Date.now() + 10000,
	startTimestamp: Date.now() + 5000,
	timer: null
};

export const load = async () => {
	
};

export const setup = (main) => {
	const bomb = document.createElement("div");
	bomb.style.cssText = `display: grid; grid-template-columns: repeat(3,calc(45% / 3)) 10% 45%; grid-template-rows: repeat(3,calc(45% / 3)) 10% repeat(3,calc(45% / 3)); grid-auto-flow: column dense; position: fixed; top: calc(max(0px,(50vh - 1.5rem) - 50vw) + 3rem); left: calc(max(0px,50vw - (50vh - 1.5rem))); width: calc(min(100vw,100vh - 3rem)); height: calc(min(100vw,100vh - 3rem))`;

		const cables = document.createElement("div");
		cables.style.cssText = `grid-column: 1 / 4; grid-row: 1 / 4; background: orange`;

		const keypad = document.createElement("div");
		keypad.style.cssText = `grid-column: 1 / 4; grid-row: 5 / 9; background: orange`;

		const timercontainer = document.createElement("div");
		timercontainer.style.cssText = " grid-column: 5; grid-row: 1 / 4; display: flex; justify-content: center; align-items: center";

			datas.timer = document.createElement("div");
			datas.timer.style.cssText = `display: flex; justify-content: center; align-items: center; width: 4em; heignt: 2em; background: #000; color: #F00; font-family: "Digital 7"; font-size: min(10vw,10vh)`;
			
			datas.timer.innerHTML = `<span style="opacity: 0.2">88:88</span>`;

			datas.timer.update = () => datas.timer.innerHTML = `<span style="opacity: ${datas.startTimestamp >= Date.now() ? "1" : "0.2"}">${datas.startTimestamp >= Date.now() ? Math.floor((datas.endTimestamp - datas.startTimestamp) / 1000 / 60 % 60) : "88"}<span style="opacity: ${(datas.startTimestamp < Date.now() || ((datas.endTimestamp - Date.now()) % 500) > 500) ? "1" : "0.2"}">:</span>${datas.startTimestamp >= Date.now() ? Math.floor((datas.endTimestamp - datas.startTimestamp) / 1000 % 60) : "88"}</span>`;
			
			timercontainer.append(datas.timer);

		const custombtn = document.createElement("div");
		custombtn.style.cssText = `grid-column: 5; grid-row: 5 / 9; background: orange`;

		for (let x = 0; x < 9; ++x) {
			const led = document.createElement("div");
			led.style.cssText = ``;
			bomb.append(led);
		}

		const middleled = document.createElement("div");
		middleled.style.cssText = `grid-column: 4; grid-row: 4; `;
		
		bomb.append(cables,keypad,timercontainer,custombtn,middleled);

	main.append(bomb);
};

const update = () => {
	if (Date.now() < datas.endTimestamp) {
		if (Date.now() > datas.startTimestamp) {
			if (datas.timer && typeof datas.timer.update === "function") {
				datas.timer.update();
			}
		}
		
		requestAnimationFrame(update);
	}
};

export const run = () => {
	update();
};