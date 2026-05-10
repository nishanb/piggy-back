// End-to-end test: spin up server, connect a client, and prove traffic is
// forwarded correctly under realistic conditions:
//   1. Single HTTP request
//   2. Concurrent requests (proves multiplexing works)
//   3. Binary payload integrity (proves no utf8 corruption)
//   4. Raw TCP echo (proves protocol-agnostic forwarding)
//
// Targets a local origin server we spin up in-process. Doesn't need Docker.

process.env.PIGGY_LOG = "plain"; // suppress dashboard redraws during tests

const http = require("http");
const net = require("net");
const crypto = require("crypto");

const { startServer } = require("../server/server");
const { forwardTraffic } = require("../client/client");

const WS_PORT = 18080;
const TUNNEL_PORT = 19000;

let httpOrigin, tcpOrigin, wss, wsClient;

const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exitCode = 1;
};

const ok = (msg) => console.log("PASS:", msg);

const waitForListener = (host, port, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const s = net.createConnection(port, host);
      s.once("connect", () => { s.destroy(); resolve(); });
      s.once("error", () => {
        s.destroy();
        if (Date.now() > deadline) reject(new Error(`timeout waiting for ${host}:${port}`));
        else setTimeout(tick, 50);
      });
    };
    tick();
  });

const httpGet = (port, path) =>
  new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("http timeout")));
  });

const httpPost = (port, path, payload) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: { "content-type": "application/octet-stream", "content-length": payload.length },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

const tcpExchange = (port, send) =>
  new Promise((resolve, reject) => {
    const s = net.createConnection(port, "127.0.0.1");
    const chunks = [];
    let received = 0;
    const finish = (val) => { s.destroy(); resolve(val); };
    s.on("connect", () => s.write(send));
    s.on("data", (c) => {
      chunks.push(c);
      received += c.length;
      if (received >= send.length) finish(Buffer.concat(chunks));
    });
    s.on("error", reject);
    setTimeout(() => { s.destroy(); reject(new Error("tcp timeout")); }, 5000);
  });

async function run() {
  // 1. Spin up an HTTP origin and a TCP echo origin.
  httpOrigin = http.createServer((req, res) => {
    if (req.method === "POST") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        res.writeHead(200, { "content-type": "application/octet-stream", "content-length": body.length });
        res.end(body);
      });
    } else {
      const q = new URL(req.url, "http://x").searchParams.get("q") || "hello";
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(`echo:${q}`);
    }
  });
  await new Promise((r) => httpOrigin.listen(0, "127.0.0.1", r));
  const httpOriginPort = httpOrigin.address().port;

  tcpOrigin = net.createServer((sock) => {
    sock.on("data", (c) => sock.write(c)); // echo
  });
  await new Promise((r) => tcpOrigin.listen(0, "127.0.0.1", r));
  const tcpOriginPort = tcpOrigin.address().port;

  // 2. Start piggyback server.
  wss = startServer(WS_PORT, { tunnelPort: TUNNEL_PORT, tunnelHost: "127.0.0.1" });

  // 3. Start an HTTP-tunneling client.
  wsClient = forwardTraffic("127.0.0.1", httpOriginPort, `ws://127.0.0.1:${WS_PORT}/http-stream`);
  await waitForListener("127.0.0.1", TUNNEL_PORT);
  // small grace period so the WS handshake completes before first request
  await new Promise((r) => setTimeout(r, 100));

  // --- Test 1: single GET ---
  try {
    const r = await httpGet(TUNNEL_PORT, "/?q=ping");
    if (r.status === 200 && r.body.toString() === "echo:ping") ok("single HTTP GET");
    else fail(`single GET: status=${r.status} body=${r.body}`);
  } catch (e) { fail(`single GET threw: ${e.message}`); }

  // --- Test 2: concurrent GETs (multiplexing) ---
  try {
    const N = 20;
    const expected = Array.from({ length: N }, (_, i) => `q${i}`);
    const results = await Promise.all(expected.map((q) => httpGet(TUNNEL_PORT, `/?q=${q}`)));
    const bad = results
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => r.status !== 200 || r.body.toString() !== `echo:${expected[i]}`);
    if (bad.length === 0) ok(`concurrent HTTP x${N} (multiplexing)`);
    else fail(`concurrent: ${bad.length}/${N} mismatched, sample: ${bad[0].r.body}`);
  } catch (e) { fail(`concurrent threw: ${e.message}`); }

  // --- Test 3: binary integrity ---
  try {
    const payload = crypto.randomBytes(64 * 1024); // 64KB random binary
    const r = await httpPost(TUNNEL_PORT, "/", payload);
    if (r.status === 200 && r.body.equals(payload)) ok("binary payload integrity (64KB)");
    else fail(`binary: status=${r.status} length=${r.body.length}/${payload.length} match=${r.body.equals(payload)}`);
  } catch (e) { fail(`binary threw: ${e.message}`); }

  // --- Test 4: HELLO frame delivers access URL to client ---
  try {
    const WebSocket = require("ws");
    const { decode, TYPE_HELLO } = require("../shared/frame");
    const helloPort = WS_PORT + 5;
    const helloTunnelPort = TUNNEL_PORT + 5;
    const helloWss = startServer(helloPort, {
      tunnelPort: helloTunnelPort,
      tunnelHost: "127.0.0.1",
      publicHost: "tunnel.example.com",
    });
    const got = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${helloPort}/http-stream`, {
        headers: { Host: "explicit-host:1234" },
      });
      ws.binaryType = "nodebuffer";
      ws.on("message", (msg) => {
        const frame = decode(msg);
        if (frame.type === TYPE_HELLO) {
          ws.close();
          resolve(JSON.parse(frame.payload.toString("utf8")));
        }
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("HELLO timeout")), 3000);
    });
    helloWss.close();
    if (got.publicHost === "tunnel.example.com" && got.tunnelPort === helloTunnelPort && got.version) {
      ok(`HELLO frame delivers access URL (publicHost=${got.publicHost}, port=${got.tunnelPort}, version=${got.version})`);
    } else {
      fail(`HELLO mismatch: ${JSON.stringify(got)}`);
    }
  } catch (e) { fail(`HELLO threw: ${e.message}`); }

  // --- Test 5: raw TCP (non-HTTP) protocol passthrough ---
  // Switch the client to point at the tcp echo origin, on a fresh tunnel.
  wsClient.close();
  await new Promise((r) => setTimeout(r, 100));

  const WS_PORT_2 = WS_PORT + 1;
  const TUNNEL_PORT_2 = TUNNEL_PORT + 1;
  const wss2 = startServer(WS_PORT_2, { tunnelPort: TUNNEL_PORT_2, tunnelHost: "127.0.0.1" });
  const wsClient2 = forwardTraffic("127.0.0.1", tcpOriginPort, `ws://127.0.0.1:${WS_PORT_2}/http-stream`);
  await waitForListener("127.0.0.1", TUNNEL_PORT_2);
  await new Promise((r) => setTimeout(r, 100));

  try {
    const send = crypto.randomBytes(8192);
    const got = await tcpExchange(TUNNEL_PORT_2, send);
    if (got.equals(send)) ok("raw TCP echo (protocol-agnostic, 8KB binary)");
    else fail(`raw TCP: got ${got.length}/${send.length} bytes, match=${got.equals(send)}`);
  } catch (e) { fail(`raw TCP threw: ${e.message}`); }

  // --- Test 6: bulk throughput (proves backpressure + binary path are sane) ---
  // Sink server: accept, count bytes, ack at end. Source connects through tunnel
  // and uploads MB. Check we hit non-trivial throughput.
  try {
    const TOTAL = 32 * 1024 * 1024; // 32 MiB
    const sinkServer = net.createServer((sock) => {
      let received = 0;
      sock.on("data", (c) => {
        received += c.length;
        if (received >= TOTAL) sock.end(`OK ${received}\n`);
      });
    });
    await new Promise((r) => sinkServer.listen(0, "127.0.0.1", r));
    const sinkPort = sinkServer.address().port;

    const WS_PORT_3 = WS_PORT + 2;
    const TUNNEL_PORT_3 = TUNNEL_PORT + 2;
    const wss3 = startServer(WS_PORT_3, { tunnelPort: TUNNEL_PORT_3, tunnelHost: "127.0.0.1" });
    const wsClient3 = forwardTraffic("127.0.0.1", sinkPort, `ws://127.0.0.1:${WS_PORT_3}/http-stream`);
    await waitForListener("127.0.0.1", TUNNEL_PORT_3);
    await new Promise((r) => setTimeout(r, 100));

    const start = Date.now();
    const result = await new Promise((resolve, reject) => {
      const s = net.createConnection(TUNNEL_PORT_3, "127.0.0.1");
      const chunk = Buffer.alloc(64 * 1024, 0xab);
      let sent = 0;
      let ackChunks = [];
      s.on("connect", () => {
        const writeMore = () => {
          while (sent < TOTAL) {
            const ok = s.write(chunk);
            sent += chunk.length;
            if (!ok) { s.once("drain", writeMore); return; }
          }
        };
        writeMore();
      });
      s.on("data", (c) => ackChunks.push(c));
      s.on("end", () => resolve(Buffer.concat(ackChunks).toString().trim()));
      s.on("error", reject);
      setTimeout(() => { s.destroy(); reject(new Error("throughput timeout")); }, 30000);
    });
    const ms = Date.now() - start;
    const mbps = (TOTAL / 1024 / 1024) / (ms / 1000);
    wsClient3.close();
    wss3.close();
    sinkServer.close();
    if (result.startsWith("OK") && mbps > 50) {
      ok(`throughput ${mbps.toFixed(1)} MiB/s for ${TOTAL / 1024 / 1024} MiB upload (${ms} ms)`);
    } else {
      fail(`throughput too low: ${mbps.toFixed(1)} MiB/s (${ms} ms), ack="${result}"`);
    }
  } catch (e) { fail(`throughput threw: ${e.message}`); }

  // teardown
  wsClient2.close();
  wss2.close();
  wss.close();
  tcpOrigin.close();
  httpOrigin.close();

  // give sockets time to flush before exiting
  setTimeout(() => process.exit(process.exitCode || 0), 200);
}

run().catch((e) => {
  console.error("test runner crashed:", e);
  process.exit(1);
});
