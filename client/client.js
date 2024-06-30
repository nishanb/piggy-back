const { getWsStream } = require("./utils/wsStreamHandler");
const { connectToSocket } = require("./utils/clientSocketHandler");
const { pipe } = require("./utils/streamPipeHandler");

const url = "ws://localhost:8080/http-stream";

const forwardTraffic = (localHost, localPort) => {
    // Connect to WS Stream
    const wsStream = getWsStream(url);

    //Connect to localsocekt
    const clientSocket = connectToSocket(localHost, localPort);

    //pipe tcp & websocket streams
    pipe(clientSocket, wsStream, localHost, localPort);

    return { clientSocket, wsStream }
}

module.exports.forwardTraffic = forwardTraffic