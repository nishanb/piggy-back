const { Command } = require('commander');
const { forwardTraffic } = require("./client");

const program = new Command();
let clientSocket = null;
let wsStream = null;


program
    .name('piggyback')
    .description('CLI to use piggyback service')
    .version('1.0');

program.command('connect')
    .description('Connect to piggyback server and forward traffic')
    .argument('<hostname>', 'Host address')
    .argument('<port>', 'Port number')
    .action((hostname, port) => {
        try {
            forwardTraffic(hostname, port);
            console.log(`Connected to ${hostname}:${port}`);
        } catch (error) {
            console.error(`Failed to connect to ${hostname}:${port}:`, error);
        }
    });

program.parse();

const cleanup = () => {
    console.log("Caught interrupt signal");
    process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
