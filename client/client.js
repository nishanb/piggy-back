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

ws.onmessage = (data) => {
    console.log("Request from server");
};

ws.onclose = (data) => {
    console.log("Closing connection with server ");
};

var clientSocket = new Socket();
clientSocket.setKeepAlive(true);

clientSocket.on("data", (data) => {
    console.log("TCP : Read");
});

// Add a 'close' event handler for the client socket
clientSocket.on("close", function (e) {
    console.log("socket closed ");
});

clientSocket.connect("80", "localhost", function () {
    console.log("Connected localhost:80 ");
    wsStream.pipe(clientSocket).pipe(wsStream);
});

clientSocket.on('error', (err) => {
    console.log(err)
})