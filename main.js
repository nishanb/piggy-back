#! /usr/bin/env node
const { program } = require("commander");
const { forwardTraffic } = require("./client/client");
const { startServer } = require("./server/server");

program
  .name("piggyback")
  .description("CLI to operate piggyback tunnel")
  .version("1.1.0");

program
  .command("serve")
  .description("Operate in server mode (public side)")
  .option("-p, --port <number>", "WebSocket port", "8080")
  .option("-t, --tunnel-port <number>", "TCP tunnel listen port (0 = random)", "0")
  .option("-H, --tunnel-host <addr>", "TCP tunnel bind address", "0.0.0.0")
  .option(
    "--public-host <host>",
    "Public hostname/IP to advertise to the client (defaults to whatever host the client used)"
  )
  .action((args) => {
    const port = Number(args.port);
    const tunnelPort = Number(args.tunnelPort);
    startServer(port, {
      tunnelPort,
      tunnelHost: args.tunnelHost,
      publicHost: args.publicHost,
    });
  });

// Accept short forms for -s: "host:port", "ws://host:port", or full URL.
const normalizeServerUrl = (s) => {
  let u = (s || "").trim();
  if (!/^wss?:\/\//.test(u)) u = "ws://" + u;
  const parsed = new URL(u);
  if (!parsed.pathname || parsed.pathname === "/") parsed.pathname = "/http-stream";
  return parsed.toString();
};

program
  .command("forward")
  .description("Operate in client mode (private side)")
  .requiredOption("-p, --port <number>", "Local service port")
  .option("-h, --host <addr>", "Local service host", "localhost")
  .option(
    "-s, --server <url>",
    "Piggyback server. Accepts host:port, ws://host:port, or full URL.",
    "localhost:8080"
  )
  .action((args) => {
    const port = Number(args.port);
    const serverUrl = normalizeServerUrl(args.server);
    forwardTraffic(args.host, port, serverUrl);
  });

program.parse(process.argv);

const cleanup = () => process.exit();
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
