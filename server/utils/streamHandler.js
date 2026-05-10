const { createSocketServer } = require("./tcpSocketHanler");
const {
  TYPE_OPEN,
  TYPE_DATA,
  TYPE_CLOSE,
  TYPE_HELLO,
  encode,
  decode,
} = require("../../shared/frame");

const VERSION = require("../../package.json").version;

// Pick a sensible host to advertise to the client. Order:
//   1. explicit --public-host
//   2. the host the client used to reach us (from WS Host header)
//   3. fall back to a placeholder
const pickPublicHost = (opts, req) => {
  if (opts.publicHost) return opts.publicHost;
  const hostHeader = (req.headers && req.headers.host) || "";
  const host = hostHeader.split(":")[0];
  if (host && host !== "0.0.0.0" && host !== "::") return host;
  return "<your-server>";
};

// One TCP listener + one connection table per connected WS client.
const handleStream = (wss, opts = {}) => {
  const tunnelPort = opts.tunnelPort || 0;
  const tunnelHost = opts.tunnelHost || "0.0.0.0";
  const dash = opts.dashboard;

  // Backpressure thresholds (bytes buffered in WS user-space).
  const HIGH = 1 * 1024 * 1024; // pause TCP sources above 1 MiB
  const LOW = 256 * 1024;       // resume below 256 KiB

  wss.on("connection", (ws, req) => {
    const clientLabel = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    const connections = new Map();
    const pausedSources = new Set();
    let nextConnId = 1;
    const tcpServer = createSocketServer();

    if (dash) {
      dash.setInfo({ Client: clientLabel });
      dash.event(`client ${clientLabel} connected`, "open");
    }

    const maybeResume = () => {
      if (pausedSources.size === 0 || ws.bufferedAmount > LOW) return;
      for (const s of pausedSources) s.resume();
      pausedSources.clear();
    };

    const send = (type, connId, payload, source) => {
      if (ws.readyState !== ws.OPEN) return;
      const frame = encode(type, connId, payload);
      ws.send(frame, { binary: true }, maybeResume);
      if (dash && type === TYPE_DATA) dash.incr("bytesOut", payload ? payload.length : 0);
      if (source && ws.bufferedAmount > HIGH) {
        source.pause();
        pausedSources.add(source);
      }
    };

    const closeConn = (connId, reason) => {
      const sock = connections.get(connId);
      if (!sock) return;
      connections.delete(connId);
      try { sock.destroy(); } catch (_) {}
      send(TYPE_CLOSE, connId);
      if (dash) {
        dash.set("activeConns", connections.size);
        dash.event(`#${connId} closed (${reason})`, "close");
      }
    };

    tcpServer.on("connection", (sock) => {
      sock.setNoDelay(true);
      const connId = nextConnId++;
      connections.set(connId, sock);
      const remote = `${sock.remoteAddress}:${sock.remotePort}`;
      if (dash) {
        dash.incr("totalConns", 1);
        dash.set("activeConns", connections.size);
        dash.event(`#${connId} accepted from ${remote}`, "open");
      }
      send(TYPE_OPEN, connId);

      sock.on("data", (chunk) => {
        if (dash) dash.incr("bytesIn", chunk.length);
        send(TYPE_DATA, connId, chunk, sock);
      });
      sock.on("end", () => closeConn(connId, "tcp end"));
      sock.on("close", () => closeConn(connId, "tcp close"));
      sock.on("error", (err) => closeConn(connId, err.message));
    });

    tcpServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        if (dash) dash.stop();
        console.error("");
        console.error(`Tunnel port ${tunnelPort} is already in use.`);
        console.error(`  Pick another with: piggyback serve -t <port>  (or -t 0 for random)`);
        console.error("");
        process.exit(1);
      }
    });
    tcpServer.listen(tunnelPort, tunnelHost, () => {
      const addr = tcpServer.address();
      const publicHost = pickPublicHost(opts, req);
      const accessUrl = `tcp://${publicHost}:${addr.port}`;
      if (dash) {
        dash.setInfo({ Tunnel: `tcp://${addr.address}:${addr.port}`, "Access URL": accessUrl });
        dash.event(`tunnel listening at ${addr.address}:${addr.port} (advertising ${publicHost})`, "info");
      }
      // Tell the client where customers can reach this tunnel.
      const helloPayload = Buffer.from(
        JSON.stringify({ publicHost, tunnelPort: addr.port, version: VERSION }),
        "utf8"
      );
      if (ws.readyState === ws.OPEN) {
        ws.send(encode(TYPE_HELLO, 0, helloPayload), { binary: true });
      }
    });

    ws.on("message", (msg) => {
      let frame;
      try {
        frame = decode(msg);
      } catch (e) {
        if (dash) dash.event(`bad frame from client: ${e.message}`, "error");
        return;
      }
      const sock = connections.get(frame.connId);
      if (!sock) return;
      if (frame.type === TYPE_DATA) {
        sock.write(frame.payload);
      } else if (frame.type === TYPE_CLOSE) {
        connections.delete(frame.connId);
        if (dash) dash.set("activeConns", connections.size);
        try { sock.end(); } catch (_) {}
      }
    });

    const teardown = () => {
      if (dash) {
        dash.setInfo({ Client: "(waiting for client)" });
        dash.event(`client ${clientLabel} disconnected`, "close");
        dash.set("activeConns", 0);
      }
      for (const id of Array.from(connections.keys())) {
        const s = connections.get(id);
        connections.delete(id);
        try { s.destroy(); } catch (_) {}
      }
      try { tcpServer.close(); } catch (_) {}
    };

    ws.on("close", teardown);
    ws.on("error", (err) => {
      if (dash) dash.event(`ws error: ${err.message}`, "error");
      teardown();
    });
  });
};

module.exports.handleStream = handleStream;
