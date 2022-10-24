const { createSocketServer } = require("./utils/tcpSocketHanler");
const { handleStream } = require("./utils/streamHandler");
const { prepareWsServer } = require("./utils/wsServerHandler");

const wss = prepareWsServer();
const serverSocket = createSocketServer();

handleStream(wss, serverSocket);