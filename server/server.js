const WebSocket = require("ws");
const net = require("net");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", async (ws) => {

    console.log("Client connected at wss");
    webSocketStream = await WebSocket.createWebSocketStream(ws);

    ws.on("message", (message) => {
        console.log("TCP : Recived ");
        console.log(message);
    });

    ws.on("ping", () => {
        console.log("WS -> Pong " + new Date().toLocaleString())
        ws.pong();
    });

    //create socket to read & write pipe
    const server = net.createServer(
        {
            keepAlive: true,
        },
        async (serverSocket) => {
            serverSocket.on("end", () => {
                console.log("Socket disconnected");
            });

            serverSocket.on("data", (data) => {
                console.log("TCP Sent " + serverSocket.remoteAddress + serverSocket.remotePort);
                console.log(data);
            });

            serverSocket.on("error", (err) => {
                console.log("Error" + err);
            });

            serverSocket.pipe(webSocketStream).pipe(serverSocket);
        }
    );

    ws.on("close", (data) => {
        console.log("WS Client Disconnected");
        console.log("Closing tcp listner at " + server.address().port);
        server.close();
    });

    server.on("error", (err) => {
        console.log("err" + err);
    });

    server.listen(8081, () => {
        console.log("Starting tcp listener at " + server.address().port);
        ws.send("WS-NOTIFY,Starting tcp listener at " + server.address().address + ":" + server.address().port);
    });
});