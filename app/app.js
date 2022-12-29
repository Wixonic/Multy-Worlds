const PORT = parseInt(process.env.PORT) || 8080;
const server = require("http").createServer();
const io = new (require("socket.io").Server)(server);

server.listen(PORT,() => console.info(`Server: listening on port ${PORT}`));