const { getWsStream } = require("./utils/wsStreamHandler");
const { connectToSocket } = require("./utils/clientSocketHandler");
const { pipe } = require("./utils/streamPipeHandler");

const url = "ws://localhost:8080";
const localHost = "localhost";
const localPort = 80;

// Connect to WS Stream
const wsStream = getWsStream(url);

//Connect to localsocekt
const clientSocket = connectToSocket(localHost, localPort);

//pipe tcp & websocket streams
pipe(clientSocket, wsStream, localHost, localPort);

//handle exit
process.on("SIGINT", function () {
    console.log("Caught interrupt signal");

    clientSocket.destroy();
    wsStream.destroy();

    console.log("Closed Socket & Server connections");
    process.exit();
});
