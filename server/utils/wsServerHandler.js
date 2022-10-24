const WebSocket = require("ws");

const prepareWsServer = () => {
    const wss = new WebSocket.Server({ port: 8080, path: '/http-stream' }, () => {
        console.log("WS Server is up and ready to accept connection");
    });
    return wss;
}

module.exports.prepareWsServer = prepareWsServer;