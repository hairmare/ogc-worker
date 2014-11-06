"use strict";

var _ = {}, api = {}, docker = {}, es = {}, logger = {};

var saveAction = function(event) {
  api.get(event['$ref'], function (req, res, build) {
    if (build.runStage == 'pull') {
      pullImage(build)
    } else if (build.runStage == 'run') {
      runScript(build);
    } else if (build.runStage == 'clean') {
      cleanup(build);
    } else {
      logger.info({image: build.image.name, build_id: build._id}, 'nothing to do');
    }
  });
};

var saveBuild = function(build) {
  api.put('/builds/' + build._id, build, function(req, res, obj) {
    logger.info({image: build.image.name, build_id: build._id}, 'saving build');
  });
};

function pullImage(build) {
  logger.info({image: build.image.name, build_id: build._id}, 'starting pull');
  docker.pull(build.image.name + ':latest', function(err, stream) {
    logger.info(err);
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
      logger.info({image: build.image.name, build_id: build._id}, 'finished pull')
    };

    stream.pipe(es.split())
          .pipe(es.map(extractLine))
          .on('end', finishPull);
  });
}

function runScript(build) {
  logger.info({image: build.image.name, build_id: build._id}, 'starting run')

  var containerSpec = {
    Image: build.image.name,
    Name: build.image.name + '-ogc',
    Tty: true,
    Cmd: ['bash', '-c', 'uname -a; emerge-webrsync -q; emerge app-portage/gentoolkit -q; glsa-check --nocolor --list all; echo Done']
  };
  docker.createContainer(containerSpec, function (err, container) {
    logger.info(err);
    logger.info({image: build.image.name, build_id: build._id}, 'created container');
    build.run = {
      date: Date.now,
      log: []
    };
    container.start(function (err, data) {
      logger.info(err);
      logger.info({image: build.image.name, build_id: build._id}, 'started container')
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
        logger.info({image: build.image.name, build_id: build._id}, 'finished run');
      };

      stream.pipe(es.split())
            .pipe(es.map(extractLine))
            .on('end', finishRun);
    });
  });
}

function cleanup(build) {
  logger.info({image: build.image.name, build_id: build._id}, 'cleaning up');

  docker.getContainer(build.image.name + '-ogc').remove(function (err, data) {
    logger.info(err)
    logger.info({image: build.image.name, build_id: build._id}, 'finished cleanup');
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

function BuildWorker(underscore, apiClient, dockerCmd, eventStream, bunyan) {
  _ = underscore;
  api = apiClient;
  docker = dockerCmd;
  es = eventStream;
  logger = bunyan;
  return {
    save: function() {
      return saveAction;
    }
  }
}

module.exports = BuildWorker;
