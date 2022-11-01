const WebSocket = require("ws");
var ip = require("ip");

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
                console.debug(`TCP Write  ${serverSocketSocket.address().address}:${serverSocketSocket.address().port} -> ${req.socket.localAddress}:${req.socket.localPort}`);
                await ws.readyState == 1;
                webSocketStream.write(data)
            });

            webSocketStream.on('data', async (data) => {
                console.debug(`TCP Read ${req.socket.localAddress}:${req.socket.localPort} -> ${serverSocketSocket.localAddress}:${serverSocketSocket.localPort}`);
                await serverSocketSocket.readyState == "open";
                serverSocketSocket.write(data);
            })
        });

        // prepare listening connection 
        serverSocket.listen(8083, () => {
            console.log("Starting tcp listener at " + serverSocket.address().port);
            ws.send("WS-NOTIFY, Starting tcp listener at " + ip.address() + ":" + serverSocket.address().port);
        });
    });
}

module.exports.handleStream = handleStream;