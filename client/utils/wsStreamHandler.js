const WebSocket = require("ws");

// Connect to the piggyback server. Returns the raw WebSocket (binary mode).
const connectWs = (wsUrl, dashboard, { onOpen, onMessage, onClose } = {}) => {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
  ws.binaryType = "nodebuffer";

  ws.on("open", () => {
    if (dashboard) {
      dashboard.setStatus("online");
      dashboard.event(`connected to ${wsUrl}`, "open");
    }
    if (onOpen) onOpen(ws);
  });

  ws.on("message", (data) => {
    if (onMessage) onMessage(data);
  });

  ws.on("error", (err) => {
    if (dashboard) dashboard.event(`websocket error: ${err.message}`, "error");
  });

  ws.on("close", (code, reason) => {
    if (dashboard) {
      dashboard.setStatus("offline");
      dashboard.event(`websocket closed (${code}) ${reason || ""}`, "close");
    }
    if (onClose) onClose(code, reason);
  });

  const ping = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
  }, 15000);
  ws.on("close", () => clearInterval(ping));

  return ws;
};

module.exports.connectWs = connectWs;
