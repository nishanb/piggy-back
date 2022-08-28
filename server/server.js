const WebSocket = require("ws");
const net = require("net");
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", async (ws, req) => {

    const clientAddress = req.socket.remoteAddress + ":" + req.socket.remotePort
    console.log("New Client Connected IP : " + clientAddress);

    const webSocketStream = await WebSocket.createWebSocketStream(ws);

    ws.on("message", (message) => {
        console.log("TCP : Recived ");
        console.log(message);
    });

    ws.on("ping", () => {
        console.log("WS -> Pong " + new Date().toLocaleString() + " " + clientAddress);
        ws.pong();
    });

    ws.on("close", (data) => {
        console.log("WS Client Disconnected");
        console.log("Closing tcp listner at " + server.address());
        server.close();
    });

    //create socket to read & write pipe
    const server = net.createServer(
        {
            keepAlive: true,
        },
        async (serverSocket) => {

            serverSocket.on("data", (data) => {
                console.log("TCP Sent " + serverSocket.remoteAddress + serverSocket.remotePort);
            });

            serverSocket.on("error", (err) => {
                console.log("Server socket Error " + err);
            });

            serverSocket.on("end", () => {
                console.log("Server socket disconnected");
            });

            serverSocket.on("end", () => {
                console.log("Server socket closed");
            });

            serverSocket.pipe(webSocketStream).pipe(serverSocket);
        }
    );

    server.on("error", (err) => {
        console.log("Server err " + err);
    });

    server.listen(8081, () => {
        console.log("Starting tcp listener at " + server.address().port);
        ws.send("WS-NOTIFY,Starting tcp listener at " + "localhost" + ":" + server.address().port);
    });
});