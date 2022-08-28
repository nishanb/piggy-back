const pipe = async (socketStream, wsStream, host, port) => {

    // Data piping operation
    socketStream.on("data", (data) => {
        console.log("<<= Data on Socket Stream =>>");
        wsStream.write(data);
    });

    wsStream.on("data", async (data) => {
        console.log("<<= Data on WS Stream =>> ");

        // reconnect to socket
        if (socketStream.readyState == "closed" || socketStream.destroyed) {
            await socketStream.connect(port, host, function () {
                console.log("Re Connecting to " + host + ":" + port);
            });
        }

        if (data.includes("WS-NOTIFY")) {
            console.log(data);
            return;
        }
        socketStream.write(data);
    });

}

module.exports.pipe = pipe;