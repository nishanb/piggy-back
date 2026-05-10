const net = require("net");

// Open a fresh TCP connection to the local target.
// Caller wires up data/close/error handlers.
const openLocalSocket = (host, port, { onConnect } = {}) => {
  const sock = new net.Socket();
  sock.setKeepAlive(true);
  sock.connect(port, host, () => {
    if (onConnect) onConnect();
  });
  return sock;
};

module.exports.openLocalSocket = openLocalSocket;
