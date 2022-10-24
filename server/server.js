const WebSocket = require("ws");
const net = require("net");

const wss = new WebSocket.Server({ port: 8080, path: '/http-stream' }, () => {
    console.log("WS Server is up and ready to accept connection");
});

wss.on("connection", async (ws, req) => {
    const clientAddress = req.socket.remoteAddress + ":" + req.socket.remotePort;
    const webSocketStream = await WebSocket.createWebSocketStream(ws);
    console.log(clientAddress + " Connected & WS stream established");

    //hearbeat check 
    ws.on("ping", () => {
        //console.log("WS -> Pong " + new Date().toLocaleString() + " " + clientAddress);
        //ws.pong();
    });

    ws.on("close", (data) => {
        console.log(clientAddress + " Disconnected from WS");
        console.log("Closing TCP listner at " + server.address().address + ":" + server.address().port);
        server.close();
    });

    //create socket to read & write pipe
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

    server.on("connection", (serverSocket) => {
        console.log("Recived new connection ");

        serverSocket.on("data", (data) => {
            console.log("<<= TCP Sent =>> ");
            webSocketStream.write(data)
        });

        webSocketStream.on('data', (data) => {
            console.log("<<= TCP Recive =>> ");
            serverSocket.write(data);
        })
    });

    server.listen(0, () => {
        console.log("Starting tcp listener at " + server.address().port);
        ws.send("WS-NOTIFY, Starting tcp listener at " + "http://localhost" + ":" + server.address().port);
    });
});