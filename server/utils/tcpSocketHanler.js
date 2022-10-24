const net = require("net");

const createSocketServer = () => {
    const server = net.createServer(
        {
            keepAlive: true,
        },
        async (serverSocket) => {
            serverSocket.on("error", (err) => {
                console.log("Server socket connection Error ==> " + err);
            });

            serverSocket.on("end", () => {
                console.log("Server socket connection disconnected");
            });

            serverSocket.on("end", () => {
                console.log("Server socket connection closed");
            });
        }
    );

    server.on("error", (err) => {
        console.log("Server err " + err);
    });

    return server;
}

module.exports.createSocketServer = createSocketServer;