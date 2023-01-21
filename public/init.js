document.fonts.forEach((font) => font.load());
document.fonts.ready.finally(() => document.body.innerHTML = `<a href="/play/">Play</a>`);