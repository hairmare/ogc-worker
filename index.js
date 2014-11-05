#!/usr/bin/env node
"use strict";

var _ = require('underscore');
var config = _.extend(require('./package.json'), require('./config.json'));

var EventEmitter = require('events').EventEmitter;
var Dockerode    = require('dockerode');
var restify      = require('restify');
var program      = require('commander');
var assert       = require('assert');
var zmq          = require('zmq');
var es           = require('event-stream');

var ee      = new EventEmitter();
var api     = function() { return require('./app/client')(config, restify, assert); };
var docker  = function() { return require('./app/docker')(config, Dockerode); };
var workers = {
  image:  function() { return require('./app/image/events')(ee,  require('./app/image/worker')(_, api(), docker())); },
  build:  function() { return require('./app/build/events')(ee,  require('./app/build/worker')(_, api(), docker(), es)); },
  report: function() { return require('./app/report/events')(ee, require('./app/report/worker')(_, api())); }
}

var running = false;

program.version(config.version)
       .usage('[work] - run an ogc worker');

program.command('list')
       .description('list available workers')
       .action(function (cmd, options) {
         console.log("\n  available workers:\n");
         _.each(Object.keys(workers), function(worker) {
           console.log("   - " + worker);
         });
         console.log("   - all (runs all workers)");
         console.log();
         process.exit(0);
       });

program.command('work [type]')
       .description('<type> - run a worker')
       .action(function(type, options) {

         type = type || 'all';

         if (type !== 'all' && !_.contains(Object.keys(workers), type)) {
           console.log("\n   error: specify a valid worker to run\n");
           process.exit(1);
         }
         console.log("starting worker " + type);

         // register worker
         if (type === 'all') {
           _.each(workers, function(worker) { worker(); });
         } else {
           workers[type]();
         }

         // replay events to worker
         var sock   = require('./app/zmq/worker')(config, zmq);

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
