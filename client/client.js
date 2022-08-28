const Socket = require("net").Socket;

const WebSocket = require("ws");
const url = "ws://localhost:8080";
const ws = new WebSocket(url);
let wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });

ws.onopen = () => {
    console.log("Connected to serever");
};

ws.onerror = (error) => {
    console.log(`WebSocket error: ${error}`);
};

ws.onclose = (data) => {
    console.log("Closing connection WS with server ");
};

// WS ping to keep stream alive every 4s
setInterval(() => {
    if (!ws.destroyed) {
        console.log("WS -> Ping " + new Date().toLocaleString())
        ws.ping()
    }
}, 2 * 1000);

// Socket connecting to consumer site
var clientSocket = new Socket();
clientSocket.setKeepAlive(true);

clientSocket.connect("80", "localhost", function () {
    console.log("Connected localhost:80 ");
});

clientSocket.on("end", function (e) {
    console.log("Closing socket connection, Reason : TCP RESET");
});

clientSocket.on("error", (err) => {
    console.log(err);
});

clientSocket.on("close", function (e) {
    console.log("socket closed ");
});

// Data piping operation
clientSocket.on("data", (data) => {
    console.log("<<= Data on client socket =>>");
    wsStream.write(data);
});

wsStream.on("data", async (data) => {
    console.log("<<= Data on WS socket =>> ");

    if (clientSocket.readyState == "closed" || clientSocket.destroyed) {
        // reconnect to socket
        await clientSocket.connect("80", "localhost", function () {
            console.log("Re Connected localhost:80 ");
        });
    }

    if (data.includes('WS-NOTIFY')) {
        console.log(data)
        return
    }

    clientSocket.write(data);
});