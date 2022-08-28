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

    clientSocket.on("error", async (err) => {
        if (err.code == "ECONNRESET") {
            await socketStream.connect(port, host, function () {
                console.log("Failed to connect socket, Retrying to connect ");
            });
        } else if (err.code == "ECONNREFUSED") {
            console.log(`Unable to connect to ${host}:${port}, is your site running ?`);
            process.exit(0);
        } else {
            console.log(err);
        }
    });

    clientSocket.on("close", function (e) {
        console.log("socket closed ");
    });

    return clientSocket;
};

module.exports.connectToSocket = connect;
