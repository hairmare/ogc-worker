"use strict";

function worker(options, zmq, logger)
{
  var sock = zmq.socket('pull');
  sock.connect(options.zmqSocket);
  logger.info({socket: options.zmqSocket}, 'worker connected to zmq socket')
  return sock;
}

module.exports = worker;
