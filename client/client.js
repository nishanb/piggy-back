const { connectWs } = require("./utils/wsStreamHandler");
const { wireUp } = require("./utils/streamPipeHandler");
const { Dashboard } = require("../shared/ui");

const DEFAULT_SERVER = "ws://localhost:8080/http-stream";

const forwardTraffic = (localHost, localPort, serverUrl = DEFAULT_SERVER, opts = {}) => {
  const dashboard = opts.quiet
    ? null
    : new Dashboard("client", {
        Server: serverUrl,
        Forwarding: `${localHost}:${localPort}`,
      });
  if (dashboard) dashboard.start();

  const ws = connectWs(serverUrl, dashboard, {
    onOpen: () => wireUp(ws, localHost, localPort, dashboard),
  });
  return ws;
};

module.exports.forwardTraffic = forwardTraffic;
