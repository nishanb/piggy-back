const net = require("net");

const createSocketServer = () => {
    const server = net.createServer(
        {
            keepAlive: true,
        },
        async (serverSocket) => {
            serverSocket.on("error", (error) => { // Changed 'err' to 'error' for consistency
                console.error(new Date().toISOString(), "TCP Client Socket Error:", error);
            });

            serverSocket.on("end", () => { // Kept one 'end' handler
                console.log(new Date().toISOString(), "TCP Client Socket disconnected/ended.");
            });

            // Removed duplicate "end" handler. 
            // The "close" event might be more specific if needed: serverSocket.on("close", (hadError) => { ... });
        }
    );

    server.on("error", (error) => { // Changed 'err' to 'error'
        console.error(new Date().toISOString(), "TCP Server Error:", error);
    });

    return server;
}

module.exports.createSocketServer = createSocketServer;