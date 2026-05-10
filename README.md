# PiggyBack

A lightweight, high-performance reverse proxy that tunnels arbitrary TCP traffic
over a single WebSocket connection. Expose a private service to the public
internet through a server you control — no cloud account, no proprietary
client, no native dependencies.

```
   ____  _                ____             _
  |  _ \(_) __ _  __ _ _ _| __ )  __ _  ___| | __
  | |_) | |/ _` |/ _` | | |  _ \ / _` |/ __| |/ /
  |  __/| | (_| | (_| | |_| |_) | (_| | (__|   <
  |_|   |_|\__, |\__, |\__|____/ \__,_|\___|_|\_\
           |___/ |___/
```

## Why

You want something like ngrok, but:

- self-hosted on a box you already have
- protocol-agnostic (HTTP, gRPC, SSH, Postgres, custom binary — anything TCP)
- no daemon, no account, no native deps, no surprises
- small enough to read in 30 minutes

PiggyBack is **~600 lines of plain JavaScript** with **3 runtime dependencies**
(`ws`, `commander`, `chalk`).

## How it works

```
                 (public internet)              (private network)
  +--------+      tcp 9000        +--------+    ws 8080      +---------+
  | client |  ──────────────►     | piggy  | ◄──────────────  | piggy   |
  |  curl  |                      | server |   binary frames  | client  |
  +--------+                      +--------+                  +---------+
                                                                   │
                                                            tcp 4321│
                                                                   ▼
                                                              +---------+
                                                              | your app|
                                                              +---------+
```

1. The **server** runs on a box with a public IP. It accepts WebSocket
   connections from clients on `--port` (default `8080`).
2. The **client** runs on the private side and dials the server.
3. As soon as the WebSocket is up, the server binds a TCP listener on
   `--tunnel-port` and tells the client about it via a `HELLO` frame.
4. Anyone connecting to `tcp://<server>:<tunnel-port>` gets multiplexed over
   the WebSocket; the client opens a fresh local TCP socket for each one and
   forwards bytes both ways.

A single WebSocket carries any number of concurrent TCP connections. Each one
gets a unique 32-bit `connId` — no head-of-line blocking, no shared state.

## Quick start

```sh
git clone git@github.com:nishanb/piggy-back.git
cd piggy-back
npm install
npm link            # installs the `piggyback` command on your PATH
```

**On the public server** (e.g. a $5 VPS):

```sh
piggyback serve -p 8080 -t 9000 --public-host tunnel.example.com
```

**On the private side** (your laptop, dev box, behind NAT):

```sh
piggyback forward -p 4321 -s tunnel.example.com:8080
```

Now `tcp://tunnel.example.com:9000` (or `http://tunnel.example.com:9000` if
your service speaks HTTP) reaches your local `localhost:4321`.

The client surfaces the public access URL on connect:

```
piggyback client  v1.1.0                              (Ctrl+C to quit)

  Status            online (uptime 12s)
  Server            ws://tunnel.example.com:8080/http-stream
  Forwarding        localhost:4321
  Access URL        tcp://tunnel.example.com:9000
  HTTP URL          http://tunnel.example.com:9000

  Connections       total 0    active 0    in 0 B    out 0 B

  Recent events
  ─────────────────────────────────────────────────────────────
  09:12:34  >  tunnel ready: customers can reach you at tcp://tunnel.example.com:9000
```

## Performance

Measured on loopback with the bundled throughput test (`32 MiB` upload through
the full server ↔ client tunnel):

| Metric                | Value           |
|-----------------------|-----------------|
| Throughput (loopback) | **~525 MiB/s**  |
| WS framing overhead   | 5 bytes/frame   |
| Concurrent conns/WS   | up to 2³² − 1   |
| Memory per conn       | one `Map` entry + Node socket |

What gets you that:

- **Binary frames end-to-end.** No JSON, no base64, no UTF-8 conversion.
- **No `perMessageDeflate`.** Compression on already-binary tunneled bytes
  burns CPU for nothing — explicitly disabled.
- **`TCP_NODELAY`** on tunneled sockets to keep small writes (HTTP headers,
  SSH packets) latency-bound, not Nagle-bound.
- **Connection multiplexing.** One WebSocket, many flows. No per-request
  WebSocket teardown.
- **Bidirectional backpressure.** When the WS user-space buffer crosses 1 MiB
  the source TCP socket is paused; resumed when it drains below 256 KiB. Fast
  senders can't OOM either side.

Run it yourself: `npm test`.

## Protocol

Every WebSocket message is one binary frame:

```
+-------+-----------+------------------+
| type  |  connId   |     payload      |
| 1 B   |   4 B BE  |     0..N B       |
+-------+-----------+------------------+
```

| Type | Direction          | Meaning                                            |
|------|--------------------|----------------------------------------------------|
| 0x01 | server → client    | OPEN: a new TCP connection is being tunneled       |
| 0x02 | bidirectional      | DATA: raw TCP bytes for `connId`                   |
| 0x03 | bidirectional      | CLOSE: the connection ended                        |
| 0x04 | server → client    | HELLO: JSON `{publicHost, tunnelPort, version}`    |

`connId = 0` is reserved for control frames (`HELLO`).

That's it. The full encoder/decoder is [shared/frame.js](shared/frame.js) —
about 30 lines.

## CLI

### `piggyback serve` (public side)

```
-p, --port <number>        WebSocket port                       (default 8080)
-t, --tunnel-port <number> TCP tunnel listen port (0 = random)  (default 0)
-H, --tunnel-host <addr>   TCP tunnel bind address              (default 0.0.0.0)
    --public-host <host>   Hostname to advertise to the client  (default: WS Host header)
```

### `piggyback forward` (private side)

```
-p, --port <number>   Local service port                                (required)
-h, --host <addr>     Local service host                                (default localhost)
-s, --server <url>    Server. Accepts host:port, ws://host:port, or full URL.
                                                                        (default localhost:8080)
```

The `-s` shortener resolves all of these to the same thing:

| Input                                       | Resolves to                              |
|---------------------------------------------|------------------------------------------|
| `localhost:8081`                            | `ws://localhost:8081/http-stream`        |
| `ws://localhost:8081`                       | `ws://localhost:8081/http-stream`        |
| `wss://tunnel.example.com`                  | `wss://tunnel.example.com/http-stream`   |
| `wss://tunnel.example.com/custom-path`      | `wss://tunnel.example.com/custom-path`   |

## Docker

The included [docker-compose.yml](docker-compose.yml) brings up an httpbin
origin, a piggyback server, and a piggyback client — useful for trying it out
with no external machine.

```sh
docker compose up
curl http://localhost:19000/get?hello=world      # hits httpbin via the tunnel
```

## Testing

```sh
npm test
```

Runs 6 end-to-end checks against in-process servers (no Docker required):

- single HTTP GET
- 20 concurrent GETs (proves multiplexing)
- 64 KB binary integrity (proves no UTF-8 corruption)
- HELLO frame delivers access URL
- raw TCP echo (proves protocol-agnostic forwarding)
- 32 MiB throughput sanity check

Set `PIGGY_LOG=plain` to disable the live dashboard (useful for CI logs).

## Project layout

```
main.js                       CLI entry (commander)
shared/
  frame.js                    binary framing protocol (~30 lines)
  ui.js                       ngrok-style live dashboard
  logo.txt                    ASCII banner
server/
  server.js                   bootstraps WS server + dashboard
  utils/
    wsServerHandler.js        ws server config (deflate off, etc.)
    streamHandler.js          per-WS connection table, backpressure, HELLO
    tcpSocketHanler.js        thin TCP listener factory
client/
  client.js                   bootstraps client WS + dashboard
  utils/
    wsStreamHandler.js        ws client config
    streamPipeHandler.js      frame routing, backpressure
    clientSocketHandler.js    thin local-socket factory
test/
  e2e.test.js                 end-to-end suite
```

## Caveats

- **Single client per WebSocket.** One client = one tunnel listener. Add a
  second client and it gets its own tunnel port (the `0` random behavior).
  No subdomain routing à la ngrok.
- **Receive-side backpressure is implicit.** We pause TCP sources when the WS
  buffer fills, but rely on Node's `socket.write` queue for the WS → local
  direction. Hasn't been a problem in practice.
- **No TLS termination.** Run behind nginx / Caddy if you need `wss://` and a
  hostname. The client speaks `wss` natively (`-s wss://...`).
- **No auth.** Anyone who can reach the WS port can claim the tunnel. Put it
  behind a reverse proxy with mTLS or a shared secret if that matters.

## License

ISC. See [LICENSE](LICENSE).
