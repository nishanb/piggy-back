const chalk = require('chalk');

const pipe = async (socketStream, wsStream, host, port) => {
    // Data piping operation
    socketStream.on("data", async (data) => {
        console.debug(`TCP Read  ${host}:${port} -> <remote>`);
        await socketStream.readyState == "open";
        wsStream.write(data);
    });

    wsStream.on("data", async (data) => {
        console.debug(`TCP Write <remote> -> ${host}:${port}`);

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

        //console.log(chalk.bgBlue.green(data));
        socketStream.write(data);
    });
}

module.exports.pipe = pipe;