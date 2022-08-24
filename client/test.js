const net = require('net')

let client = connect()
client.on('data', onData);
client.on('error', onError);
client.on("close", onClose);


function onData(data) {
    console.log(data)
}

function onError(err) {
    if (err.message.indexOf('ECONNREFUSED') > -1) {
        //do recconect
        console.log("Attempting to reconnect shortly")
        setTimeout(() => {
            client = connect();
            client.on('data', onData);
            client.on('error', onError);
            client.on("close", onClose);

        }, 1000)
    }
}
function onClose() {
    console.log("Removng all listeners")
    client.removeAllListeners("data");
    client.removeAllListeners("error")
    connect()
}

function connect() {
    const c = net.createConnection({
        port: 80
    },
        (socket) => {
            c.write("Hello")
            console.log('connected')
        });

    return c
}