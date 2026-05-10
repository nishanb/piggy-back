const WebSocket = require("ws");
const chalk = require("chalk");

const prepareWsServer = (port, dashboard) => {
  const wss = new WebSocket.Server({
    port,
    path: "/http-stream",
    perMessageDeflate: false, // tunneled bytes are already binary; deflate is pure overhead
    clientTracking: false,
  }, () => {
    if (dashboard) {
      dashboard.setStatus("online");
      dashboard.event(`listening on ws://0.0.0.0:${port}/http-stream`, "info");
    }
  });

  wss.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      // Stop the dashboard so its redraw doesn't fight our final message.
      if (dashboard) dashboard.stop();
      console.error("");
      console.error(chalk.red(`Port ${port} is already in use.`));
      console.error(`  Pick another with: ${chalk.cyan(`piggyback serve -p <port>`)}`);
      console.error(`  (and on the client) ${chalk.cyan(`piggyback forward ... -s ws://<host>:<port>/http-stream`)}`);
      console.error("");
      process.exit(1);
    }
    if (dashboard) dashboard.event(`ws server error: ${err.message}`, "error");
  });

  return wss;
};

module.exports.prepareWsServer = prepareWsServer;
