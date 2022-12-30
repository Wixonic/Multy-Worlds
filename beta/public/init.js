let fonts = [];

document.fonts.forEach((font) => {
	fonts.push(font.load());
});

Promise.all(fonts).finally(() => document.body.innerHTML = `<a href="/play/">Play</a>`);