const WebSocket = require("ws");

const handleStream = async (wss, serverSocket) => {

    wss.on("connection", async (ws, req) => {
        const clientAddress = req.socket.remoteAddress + ":" + req.socket.remotePort;
        const webSocketStream = await WebSocket.createWebSocketStream(ws);

        console.log(clientAddress + " Connected & WS stream established");

        ws.on("close", () => {
            console.log(clientAddress + " Disconnected from WS");
            console.log("Closing TCP listner at " + serverSocket.address().address + ":" + serverSocket.address().port);
            serverSocket.close();
        });

        // handel read write to sockets 
        serverSocket.on("connection", (serverSocketSocket) => {
            console.log(`Recived new connection  ${serverSocketSocket.address().family}-${serverSocketSocket.address().address}:${serverSocketSocket.address().port}`);

            serverSocketSocket.on("data", async (data) => {
                console.debug(`TCP Sent  ${serverSocketSocket.address().address}:${serverSocketSocket.address().port} -> ${req.socket.localAddress}:${req.socket.localPort}`);
                await webSocketStream.readyState == "open";
                webSocketStream.write(data)
            });

            webSocketStream.on('data', async (data) => {
                console.debug(`TCP Recived ${req.socket.localAddress}:${req.socket.localPort} -> ${serverSocketSocket.localAddress}:${serverSocketSocket.localPort}`);
                await serverSocketSocket.readyState == "open";
                serverSocketSocket.write(data);
            })
        });

        // prepare listening connection 
        serverSocket.listen(0, () => {
            console.log("Starting tcp listener at " + serverSocket.address().port);
            ws.send("WS-NOTIFY, Starting tcp listener at " + "http://localhost" + ":" + serverSocket.address().port);
        });
    });
}

module.exports.handleStream = handleStream;