const { handleStream } = require("./utils/streamHandler");
const { prepareWsServer } = require("./utils/wsServerHandler");
const { Dashboard } = require("../shared/ui");

module.exports.startServer = (port, opts = {}) => {
  const tunnelHost = opts.tunnelHost || "0.0.0.0";
  const tunnelLabel = opts.tunnelPort
    ? `tcp://${tunnelHost}:${opts.tunnelPort}`
    : `tcp://${tunnelHost}:<random>`;

  const dashboard = opts.quiet
    ? null
    : new Dashboard("server", {
        WebSocket: `ws://0.0.0.0:${port}/http-stream`,
        Tunnel: tunnelLabel,
        Client: "(waiting for client)",
      });

  if (dashboard) dashboard.start();

  const wss = prepareWsServer(port, dashboard);
  handleStream(wss, { ...opts, dashboard });
  return wss;
};
