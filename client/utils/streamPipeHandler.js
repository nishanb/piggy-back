const chalk = require('chalk');

const pipe = async (socketStream, wsStream, host, port) => {

    // Data piping operation
    socketStream.on("data", (data) => {
        console.log("<<= Data on Socket Stream =>>");
        console.log(data);
        wsStream.write(data);
    });

    wsStream.on("data", async (data) => {
        console.log("<<= Data on WS Stream =>> ");

        // reconnect to socket
        if (socketStream.readyState == "closed" || socketStream.destroyed) {
            await socketStream.connect(port, host, function () {
                console.log("Reconnected to " + host + ":" + port);
            });
        }

        if (data.includes("WS-NOTIFY")) {
            console.log(chalk.green(data));
            return;
        }
        console.log(chalk.bgBlue.green(data));
        socketStream.write(data);
    });

}

module.exports.pipe = pipe;