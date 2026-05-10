const { openLocalSocket } = require("./clientSocketHandler");
const {
  TYPE_OPEN,
  TYPE_DATA,
  TYPE_CLOSE,
  TYPE_HELLO,
  encode,
  decode,
} = require("../../shared/frame");

// Backpressure thresholds (bytes buffered in WS user-space).
const HIGH = 1 * 1024 * 1024;
const LOW = 256 * 1024;

// Drives one WebSocket: incoming frames -> local sockets, local data -> frames.
const wireUp = (ws, localHost, localPort, dashboard) => {
  const connections = new Map();
  const pausedSources = new Set();

  const maybeResume = () => {
    if (pausedSources.size === 0 || ws.bufferedAmount > LOW) return;
    for (const s of pausedSources) s.resume();
    pausedSources.clear();
  };

  const send = (type, connId, payload, source) => {
    if (ws.readyState !== ws.OPEN) return;
    const frame = encode(type, connId, payload);
    ws.send(frame, { binary: true }, maybeResume);
    if (dashboard && type === TYPE_DATA) dashboard.incr("bytesOut", payload ? payload.length : 0);
    if (source && ws.bufferedAmount > HIGH) {
      source.pause();
      pausedSources.add(source);
    }
  };

  const ensureConn = (connId) => {
    let sock = connections.get(connId);
    if (sock) return sock;

    if (dashboard) {
      dashboard.incr("totalConns", 1);
      dashboard.set("activeConns", connections.size + 1);
      dashboard.event(`#${connId} -> ${localHost}:${localPort}`, "open");
    }

    sock = openLocalSocket(localHost, localPort);
    sock.setNoDelay(true);
    connections.set(connId, sock);

    sock.on("data", (chunk) => {
      if (dashboard) dashboard.incr("bytesIn", chunk.length);
      send(TYPE_DATA, connId, chunk, sock);
    });
    const close = (reason) => {
      if (connections.delete(connId)) {
        if (dashboard) {
          dashboard.set("activeConns", connections.size);
          dashboard.event(`#${connId} closed (${reason})`, "close");
        }
        send(TYPE_CLOSE, connId);
      }
    };
    sock.on("end", () => close("local end"));
    sock.on("close", () => close("local close"));
    sock.on("error", (err) => close(err.message));

    return sock;
  };

  ws.on("message", (msg) => {
    let frame;
    try {
      frame = decode(msg);
    } catch (e) {
      if (dashboard) dashboard.event(`bad frame from server: ${e.message}`, "error");
      return;
    }

    if (frame.type === TYPE_HELLO) {
      try {
        const info = JSON.parse(frame.payload.toString("utf8"));
        const accessUrl = `tcp://${info.publicHost}:${info.tunnelPort}`;
        const httpUrl = `http://${info.publicHost}:${info.tunnelPort}`;
        if (dashboard) {
          dashboard.setInfo({
            "Access URL": accessUrl,
            "HTTP URL": httpUrl,
            "Server version": info.version || "?",
          });
          dashboard.event(`tunnel ready: customers can reach you at ${accessUrl}`, "info");
        } else {
          console.log("");
          console.log(`  Access URL:  ${accessUrl}`);
          console.log(`  If your service speaks HTTP: ${httpUrl}`);
          console.log("");
        }
      } catch (e) {
        if (dashboard) dashboard.event(`bad HELLO from server: ${e.message}`, "error");
      }
      return;
    }

    if (frame.type === TYPE_OPEN) {
      ensureConn(frame.connId);
    } else if (frame.type === TYPE_DATA) {
      const sock = ensureConn(frame.connId);
      sock.write(frame.payload);
    } else if (frame.type === TYPE_CLOSE) {
      const sock = connections.get(frame.connId);
      if (sock) {
        connections.delete(frame.connId);
        if (dashboard) dashboard.set("activeConns", connections.size);
        try { sock.end(); } catch (_) {}
      }
    }
  });

  ws.on("close", () => {
    for (const [, sock] of connections) {
      try { sock.destroy(); } catch (_) {}
    }
    connections.clear();
    if (dashboard) dashboard.set("activeConns", 0);
  });
};

module.exports.wireUp = wireUp;
