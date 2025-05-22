const WebSocket = require("ws");
var ip = require("ip");

const prepareWsServer = (port) => {
    const wss = new WebSocket.Server({ port: port, path: '/http-stream' }, () => {
        console.log(new Date().toISOString(), `WS Server is up and ready to accept connection on port ${port}`);
        console.log(new Date().toISOString(), `Connection url ws://${ip.address()}:${port}/http-stream`); // Assuming port should be dynamic here
    });

    wss.on('error', (error) => {
        console.error(new Date().toISOString(), "WebSocket Server Error:", error);
    });

    // Note: Individual client WebSocket errors (ws.on('error', ...))
    // would be handled inside wss.on('connection', (ws) => { ... });
    // This is not shown in the current file but is standard practice.

    return wss;
}

module.exports.prepareWsServer = prepareWsServer;