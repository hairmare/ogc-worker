"use strict";

function docker(options, Dockerode) {
  return new Dockerode(options.docker);
}

module.exports = docker;
