#!/usr/bin/env node
"use strict";

var EventEmitter = require('events').EventEmitter;
var Dockerode    = require('dockerode');
var restify      = require('restify');
var program      = require('commander');
var bunyan       = require('bunyan');
var zmq          = require('zmq');
var es           = require('event-stream');
var _            = require('underscore');

function getWorkers(config) {
  var api     = function() { return require('./app/client')(config, restify, logger); };
  var docker  = function() { return require('./app/docker')(config, Dockerode); };
  var workers = {
    image:  function() { return require('./app/image/events')(ee,  require('./app/image/worker')(_, api(), docker(), logger)); },
    build:  function() { return require('./app/build/events')(ee,  require('./app/build/worker')(config, _, api(), docker(), es, logger)); },
    report: function() { return require('./app/report/events')(ee, require('./app/report/worker')(_, api(), logger)); }
  }
  return workers;
}

var ee      = new EventEmitter();
var logger  = bunyan.createLogger({name: 'ogc-worker'})
var running = false;

program.version(require('./package.json').version)
       .usage('[work] - run an ogc worker');

program.command('list')
       .description('list available workers')
       .action(function (cmd, options) {
         console.log("\n  available workers:\n");
         var workers = getWorkers();
         _.each(Object.keys(workers), function(worker) {
           console.log("   - " + worker);
         });
         console.log("   - all (runs all workers)");
         console.log();
         process.exit(0);
       });

program.command('work [type]')
       .description('<type> - run a worker')
       .option('--api-host           <API_PORT_80_TCP_ADDR>',        "API host, default: localhost", process.env.API_PORT_80_TCP_ADDR || 'localhost')
       .option('--api-port           <API_PORT_80_TCP_PORT>',        "API port, default: 80\n", process.env.API_PORT_80_TCP_PORT || 80)

       .option('--zmq-socket         <ZMQ_PORT_3000_TCP>',           "zmq socket path, default: tcp://127.0.0.1:3000\n", process.env.ZMQ_PORT_3000_TCP || 'tcp://127.0.0.1:3000')

       .option('--docker-host        <DOCKER_PORT_4444_TCP_ADDR>',   "docker host, default: localhost", process.env.DOCKER_PORT_4444_TCP_ADDR || 'localhost')
       .option('--docker-port        <DOCKER_PORT_4444_TCP_PORT>',   "docker port, default: 4444\n", process.env.DOCKER_PORT_4444_TCP_PORT || 4444)

       .option('--storage-rsync-host <RSYNC_PORT_873_TCP_ADDR>',     "ogc-storage host, default: localhost", process.env.WEB_PORT_80_TCP_ADDR || 'localhost')
       .option('--storage-rsync-port <RSYNC_PORT_873_TCP_PORT>',     "ogc-storage port, default: 873", process.env.WEB_PORT_80_TCP_PORT || 873) 
       .option('--storage-web-host   <WEB_PORT_80_TCP_ADDR>',        "ogc-storage-web host, default: localhost", process.env.WEB_PORT_80_TCP_ADDR || 'localhost')
       .option('--storage-web-port   <WEB_PORT_80_TCP_PORT>',        "ogc-storage-web port, default: 80", process.env.WEB_PORT_80_TCP_PORT || 80) 
       .action(function(type, options) {

         var workers = getWorkers(options);

         type = type || 'all';

         if (type !== 'all' && !_.contains(Object.keys(workers), type)) {
           console.log("\n   error: specify a valid worker to run\n");
           process.exit(1);
         }
         logger.info({type: type}, 'starting worker ' + type);

         // register worker
         if (type === 'all') {
           _.each(workers, function(worker) { worker(options); });
         } else {
           workers[type]();
         }

         // replay events to worker
         var sock   = require('./app/zmq/worker')(options, zmq, logger);

         sock.on('message', function(msg){
           var payload = JSON.parse(msg.toString());
           ee.emit(payload.event, payload);
         });

         running = true;
       });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
if (!running) {
  program.help();
}
