const WebSocket = require("ws");
const chalk = require('chalk');

const getWsStream = (wsUrl) => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log(chalk.greenBright("Connected to WebSocket serever"));
    };

    ws.onerror = (error) => {
        console.log("Failed to connect with WS server" + error.message)
        process.exit(0)
    };

    ws.onclose = (data) => {
        console.log("Closing connection WebSocket with server " + data.reason);
    };

    // WS ping to keep stream alive every 4s
    setInterval(() => {
        if (!ws.destroyed) {
            //console.log(chalk.blue("WS -> Ping " + new Date().toLocaleString()));
            ws.ping();
        }
    }, 2 * 1000);

    let wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });

    return wsStream;
};

module.exports.getWsStream = getWsStream;
