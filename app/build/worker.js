"use strict";

var _ = {}, api = {}, docker = {}, es = {};

var saveAction = function(event) {
  api.get(event['$ref'], function (req, res, build) {
    if (build.runStage == 'pull') {
      pullImage(build)
    } else if (build.runStage == 'run') {
      runScript(build);
    } else if (build.runStage == 'clean') {
      cleanup(build);
    } else {
      console.log("Nothing to do for " + build.image.name + "/" + build._id);
    }
  });
};

var saveBuild = function(build) {
  api.put('/builds/' + build._id, build, function(req, res, obj) {
    console.log("Saving build " + build.image.name);
  });
};

function pullImage(build) {
  console.log('Starting pull for ' + build.image.name);
  docker.pull(build.image.name + ':latest', function(err, stream) {

    build.pull = {
      date: Date.now,
      log: []
    };
    var extractLine = function (line, cb) {
      _.each(line.replace(/}{/g, '}}{{').split('}{'), function(line) { build.pull.log.push(line); });
      cb(null, line);
    };
    var finishPull = function() {
      build.runStage = 'clean';
      build.pull.done = Date.now;
      saveBuild(build);
      console.log('Finished pull for ' + build.image.name);
    };

    stream.pipe(es.split())
          .pipe(es.map(extractLine))
          .on('end', finishPull);
  });
}

function runScript(build) {
  console.log('starting run for ' + build.image.name);

  var containerSpec = {
    Image: build.image.name,
    Name: build.image.name + '-ogc',
    Tty: true,
    Cmd: ['bash', '-c', 'uname -a; emerge-webrsync -q; emerge app-portage/gentoolkit -q; glsa-check --nocolor --list all; echo Done']
  };
  docker.createContainer(containerSpec, function (err, container) {
    console.log('created container for ' + build.image.name + '/' + build._id);
    build.run = {
      date: Date.now,
      log: []
    };
    container.start(function (err, data) {
      console.log('started container for ' + build.image.name);
    });
    container.attach({stream: true, stdout: true, stderr: true}, function(err, stream) {
      var extractLine = function (line, cb) {
        build.run.log.push(line);
        cb(null, line);
      };
      var finishRun = function() {
        build.runStage = 'report';
        build.run.done = Date.now;
        saveBuild(build);
        console.log('Finished run for ' + build.image.name);
      };

      stream.pipe(es.split())
            .pipe(es.map(extractLine))
            .on('end', finishRun);
    });
  });
}

function cleanup(build) {
  console.log('cleaning up after '+build.image.name+'/'+build._id);

  docker.getContainer(build.image.name + '-ogc').inspect(function(err, data) {
          console.log(data);
  });;

  docker.getContainer(build.image.name + '-ogc').remove(function (err, data) {
    console.log('cleaned up after '+build.image.name+'/'+build._id);
    build.clean = {
      date: Date.now,
      log: []
    }

    build.runStage = 'done';
    build.clean.log.push(data);
    build.clean.done = Date.now;
    saveBuild(build);
  });
}

function BuildWorker(underscore, apiClient, dockerCmd, eventStream) {
  _ = underscore;
  api = apiClient;
  docker = dockerCmd;
  es = eventStream;
  return {
    save: function() {
      return saveAction;
    }
  }
}

module.exports = BuildWorker;
