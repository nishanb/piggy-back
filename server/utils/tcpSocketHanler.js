const net = require("net");

const createSocketServer = () => {
    const server = net.createServer(
        {
            keepAlive: false,

        },
        async (serverSocket) => {
            serverSocket.on("error", (err) => {
                console.log("Server socket connection Error ==> " + err);
                serverSocket.destroy();
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