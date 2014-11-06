"use strict";

function worker(options, zmq)
{
  var sock = zmq.socket('pull');
  sock.connect(options.zmqSocket);
  console.log('Worker connected to '+options.zmqSocket);
  return sock;
}

module.exports = worker;
