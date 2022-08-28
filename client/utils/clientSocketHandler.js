const Socket = require("net").Socket;

// Socket connecting to consumer site
const connect = (host, port) => {
    var clientSocket = new Socket();
    clientSocket.setKeepAlive(true);

    clientSocket.connect(port, host, function () {
        console.log(`Connected ${host}:${port}`);
    });

    clientSocket.on("end", function (e) {
        console.log("Closing socket connection, Reason : TCP RESET");
    });

    clientSocket.on("error", (err) => {
        console.log(err);
    });

    clientSocket.on("close", function (e) {
        console.log("socket closed ");
    });

    return clientSocket;
}

module.exports.connectToSocket = connect;