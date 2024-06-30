const WebSocket = require("ws");
var ip = require("ip");
const { createSocketServer } = require("./tcpSocketHanler");

const handleStream = async (wss) => {

    wss.on("connection", async (ws, req) => {
        const clientAddress = req.socket.remoteAddress + ":" + req.socket.remotePort;
        const webSocketStream = await WebSocket.createWebSocketStream(ws);
        const serverSocket = createSocketServer();

        console.log(clientAddress + " Connected & WS stream established");

        ws.on("close", () => {
            console.log(clientAddress + " Disconnected from Client");
            console.log("Closing TCP listner at " + serverSocket.address().address + ":" + serverSocket.address().port);
            serverSocket.close();
        });

        // handel read write to sockets 
        serverSocket.on("connection", (serverSocketSocket) => {
            console.log(`Recived new connection  ${serverSocketSocket.address().family}-${serverSocketSocket.address().address}:${serverSocketSocket.address().port}`);

            serverSocketSocket.on("data", async (data) => {
                await ws.readyState == 1;
                console.debug(`Forward - Server[${serverSocketSocket.address().address}:${serverSocketSocket.address().port}] -> Client[${clientAddress}]`);
                webSocketStream.write(data)
            });

            webSocketStream.on('data', async (data) => {
                await serverSocketSocket != null && serverSocketSocket.readyState == "open";
                console.debug(`Forward - Client[${clientAddress}] -> Server[${serverSocketSocket.address().address}:${serverSocketSocket.address().port}`);
                serverSocketSocket.write(data);
            })

            serverSocketSocket.on("error", (e) => {
                console.log(e)
            })
        });

        // prepare listening connection 
        serverSocket.listen(0, () => {
            console.log("Starting tcp listener at " + serverSocket.address().port);
            ws.send("WS-NOTIFY, Starting tcp listener at " + ip.address() + ":" + serverSocket.address().port);
        });
    });
}

module.exports.handleStream = handleStream;