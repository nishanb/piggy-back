const Socket = require("net").Socket;
const chalk = require('chalk');

// Socket connecting to consumer site
const connect = (host, port) => {
    var clientSocket = new Socket();
    clientSocket.setKeepAlive(true);
    let reconnectTimeoutId = null;

    const retryableErrorCodes = [
        'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED',
        'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE'
    ];

    const connectionListener = () => {
        console.log(chalk.green(`Successfully connected/reconnected to ${host}:${port}`));
        if (reconnectTimeoutId) { // Clear timeout if connection was successful
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }
    };

    const attemptConnection = () => {
        console.log(chalk.blue(`Attempting connection to ${host}:${port}...`));
        // Ensure the socket is not already connecting or connected if issues arise.
        // However, .connect() on an existing socket should handle this.
        clientSocket.connect(port, host, connectionListener);
    };
    
    clientSocket.on("connect", connectionListener); // Added for clarity though callback in connect also works

    clientSocket.on("end", function () {
        console.log(chalk.yellow(`Socket connection to ${host}:${port} ended by remote host.`));
        // Typically, 'end' means the other side closed its write stream.
        // Depending on requirements, might want to attempt reconnect here too if not followed by 'close' with hadError=false
    });

    clientSocket.on("error", (err) => {
        if (reconnectTimeoutId) { // Prevent scheduling multiple retries
            clearTimeout(reconnectTimeoutId);
        }

        if (retryableErrorCodes.includes(err.code)) {
            console.log(chalk.red(`Socket error: ${err.code}. Scheduling reconnection to ${host}:${port} in 5 seconds...`));
            reconnectTimeoutId = setTimeout(attemptConnection, 5000);
        } else {
            console.log(chalk.red("Unhandled socket error:"), err);
            // No process.exit(0) here, let the calling application decide.
        }
    });

    clientSocket.on("close", function (hadError) {
        if (reconnectTimeoutId) { // Clear any error-driven retry if close happens
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null; 
        }
        if (hadError) {
            console.log(chalk.red(`Socket connection to ${host}:${port} closed due to a transmission error. Scheduling reconnection in 5 seconds...`));
            // Ensure we don't stack reconnections if an error also triggered one
            reconnectTimeoutId = setTimeout(attemptConnection, 5000);
        } else {
            console.log(chalk.yellow(`Socket connection to ${host}:${port} closed gracefully. Not attempting to reconnect.`));
        }
    });

    // Initial connection attempt
    attemptConnection();

    return clientSocket;
};

module.exports.connectToSocket = connect;