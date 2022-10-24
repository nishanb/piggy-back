const Socket = require("net").Socket;
const chalk = require('chalk');

// Socket connecting to consumer site
const connect = (host, port) => {
    var clientSocket = new Socket();
    clientSocket.setKeepAlive(true);

    clientSocket.connect(port, host, function () {
        console.log(chalk.green(`Connected ${host}:${port}`));
    });

    clientSocket.on("end", function (e) {
        console.log(chalk.red(`Closing socket connection to ${host}:${port}`));
    });

    clientSocket.on("error", async (err) => {
        if (err.code == "ECONNRESET") {
            await clientSocket.connect(port, host, function () {
                console.log(chalk.blue("Failed to connect socket, Retrying to connect .."));
            });

        } else if (err.code == "ECONNREFUSED") {
            console.log(chalk.red(`Unable to connect to ${host}:${port}, is your application running ?`));
            process.exit(0);
        } else {
            console.log(err);
        }
    });

    clientSocket.on("close", function (e) {
        if (e == false) {
            console.log(chalk.green("socket closed due to incactivity"));
            return;
        }
        console.log(chalk.red("Client socket closed"));
    });

    return clientSocket;
};

module.exports.connectToSocket = connect;