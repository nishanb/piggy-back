const { handleStream } = require("./utils/streamHandler");
const { prepareWsServer } = require("./utils/wsServerHandler");

module.exports.startServer = (port) => {
    const wss = prepareWsServer(port);
    handleStream(wss);
}
