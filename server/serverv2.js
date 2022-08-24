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

    //create socket to read & write pipe
    const server = net.createServer(async (serverSocket) => {
        serverSocket.on("end", () => {
            console.log("socket disconnected");
        });

        serverSocket.on("data", (data) => {
            console.log("TCP Sent " + serverSocket.remoteAddress + serverSocket.remotePort);
            console.log(data);


        });

        serverSocket.pipe(webSocketStream).pipe(serverSocket);
    });

    server.on("error", (err) => {
        console.log("err" + err);
    });

    server.listen(8081, () => {
        console.log("http server started 8081");
    });

    ws.on("close", (data) => {
        console.log("Client disconnected");
        server.removeAllListeners();
        server.close();
        console.log("Closing http listner at 8081");
    });
});