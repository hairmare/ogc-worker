"use strict";

function docker(options, Dockerode) {
  return new Dockerode({
    socketPath: false,
    host: 'http://'+options.dockerHost,
    port: options.dockerPort
  });
}

module.exports = docker;
