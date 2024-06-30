const { handleStream } = require("./utils/streamHandler");
const { prepareWsServer } = require("./utils/wsServerHandler");

const wss = prepareWsServer();

handleStream(wss);