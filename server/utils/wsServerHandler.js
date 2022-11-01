const WebSocket = require("ws");
var ip = require("ip");

const prepareWsServer = () => {
    const wss = new WebSocket.Server({ port: 8080, path: '/http-stream' }, () => {
        console.log("WS Server is up and ready to accept connection");
        console.log(`Connection url ws://${ip.address()}:8080/http-stream`)
    });
    return wss;
}

module.exports.prepareWsServer = prepareWsServer;