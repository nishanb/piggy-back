const WebSocket = require("ws");

const getWsStream = (wsUrl) => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("Connected to WebSocket serever");
    };

    ws.onerror = (error) => {
        console.log(`WebSocket error: ${error}`);
    };

    ws.onclose = (data) => {
        console.log("Closing connection WebSocket with server ");
    };

    // WS ping to keep stream alive every 4s
    setInterval(() => {
        if (!ws.destroyed) {
            console.log("WS -> Ping " + new Date().toLocaleString());
            ws.ping();
        }
    }, 2 * 1000);

    let wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });

    return wsStream;
};

module.exports.getWsStream = getWsStream;
