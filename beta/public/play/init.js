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

let fonts = [];

document.fonts.forEach((font) => {
	fonts.push(font.load());
});

window.addEventListener("load",() => window.loaded = true);

Promise.all(fonts).finally(async () => {
	document.body.innerHTML = `<header><id></id><title>Multy Worlds</title><ping>?? ms</ping></header><main status="loading"><h1>Connecting to server...</h1><p>If you're stuck on this page, reload it.</p></main>`;
	
	while (!(window.loaded && window.start)) {
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
	
	window.start();
});