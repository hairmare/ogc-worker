"use strict";

function worker(options, zmq)
{
  var sock = zmq.socket('pull');
  sock.connect(options.zmq.worker);
  console.log('Worker connected to port 3000');
  return sock;
}

module.exports = worker;
