window.server = "beta";

try {
	const searchParams = new URLSearchParams(location.search);
	server = searchParams.get("server");

	if (!["beta"].includes(server)) {
		server = "beta";
	}
} catch {}
server = location.hostname === "localhost" ? "local" : server;
history.pushState(null,"",`${location.protocol}//${location.host}${location.pathname}?server=${server}`);


window.reset = () => {
	document.body.innerHTML = `<header><id></id><title>Multy Worlds</title><ping>xx ms</ping></header><main status="connecting"><h1>Connecting to server...</h1><p>If you're stuck on this page, reload it.</p></main>`;
};

document.fonts.load("1rem Inter").finally(() => {
	reset();
	
	document.fonts.forEach((font) => font.load());
	document.fonts.ready.finally(async () => {
		while (!(window.loaded && window.start)) {
			await new Promise((resolve) => requestAnimationFrame(resolve));
		}
		
		window.start();
	});
});

window.addEventListener("load",() => window.loaded = true);