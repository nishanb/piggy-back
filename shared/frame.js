// Binary framing for the WebSocket control link.
//
// Each WebSocket message is a single frame:
//   [1 byte type][4 bytes connId, big-endian][payload bytes]
//
// Types:
//   0x01 OPEN   server -> client. Announces a new tunneled connection.
//                                 Payload is empty.
//   0x02 DATA   bidirectional.    Payload is raw TCP bytes for connId.
//   0x03 CLOSE  bidirectional.    The connection is closed. Payload empty.
//   0x04 HELLO  server -> client. Sent once, immediately after the tunnel
//                                 TCP listener binds. Payload is UTF-8 JSON
//                                 with { publicHost, tunnelPort, version }.
//                                 connId is 0 (reserved for control).
//
// connId namespace is per-WebSocket; the server allocates it.

const TYPE_OPEN = 0x01;
const TYPE_DATA = 0x02;
const TYPE_CLOSE = 0x03;
const TYPE_HELLO = 0x04;

const HEADER_LEN = 5;

function encode(type, connId, payload) {
  const body = payload && payload.length ? payload : Buffer.alloc(0);
  const buf = Buffer.allocUnsafe(HEADER_LEN + body.length);
  buf.writeUInt8(type, 0);
  buf.writeUInt32BE(connId >>> 0, 1);
  if (body.length) body.copy(buf, HEADER_LEN);
  return buf;
}

function decode(message) {
  const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);
  if (buf.length < HEADER_LEN) throw new Error("frame too short");
  return {
    type: buf.readUInt8(0),
    connId: buf.readUInt32BE(1),
    payload: buf.length > HEADER_LEN ? buf.subarray(HEADER_LEN) : Buffer.alloc(0),
  };
}

module.exports = {
  TYPE_OPEN,
  TYPE_DATA,
  TYPE_CLOSE,
  TYPE_HELLO,
  encode,
  decode,
};
