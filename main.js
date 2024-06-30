#! /usr/bin/env node
const { program } = require('commander')
const { forwardTraffic } = require("./client/client");
const { startServer } = require("./server/server");

program
    .name('piggyback')
    .description('CLI to operate piggyback tunnel')
    .version('1.0')

program
    .command('serve')
    .description('Operate in server mode to accept traffic')
    .requiredOption('-p, --port <number>', 'websocket port', 8080)
    .action((args) => {
        try {
            startServer(args.port);
        } catch (error) {
            console.error(`Failed to create piggy back server on port :${args.port}:`, error);
        }
    })

program
    .command('forward')
    .description('Operate in client mode to forward traffic ')
    .requiredOption('-p, --port <number>', 'Port number of service')
    .option('-h, --host <number>', 'host address of service', 'localhost')
    .action((args) => {
        try {
            forwardTraffic(args.hostname, args.port);
            console.log(`Connected to ${args.hostname}:${args.port}`);
        } catch (error) {
            console.error(`Failed to connect to ${args.hostname}:${args.port}:`, error);
        }
    })

program.parse(process.argv)


//Clean Up
const cleanup = () => {
    process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);