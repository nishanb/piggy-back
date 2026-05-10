const net = require("net");

// Creates a TCP listener. Caller wires up the 'connection' handler.
const createSocketServer = () => {
  const server = net.createServer({ allowHalfOpen: false, keepAlive: true });
  server.on("error", (err) => {
    console.log("TCP listener error:", err.message);
  });
  return server;
};

module.exports.createSocketServer = createSocketServer;
