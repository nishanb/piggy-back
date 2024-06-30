const { handleStream } = require("./utils/streamHandler");
const { prepareWsServer } = require("./utils/wsServerHandler");

module.exports.startServer = (port) => {
    console.log(`Preparing piggyback server on port : ${port}`)
    const wss = prepareWsServer(port);
    handleStream(wss);
}
