"use strict";

var options = {}, _ = {}, api = {}, docker = {}, es = {}, logger = {};

var saveAction = function(event) {
  api.get(event['$ref'], function (req, res, build) {

    if (build.needsRun) {
      switch(build.runStage) {
        case 'pull':
          pullImage(build);
          break;
        case 'run':
          runScript(build);
          break;
        case 'report':
          build.runStage = 'clean';
          saveBuild(build);
          break;
        case 'clean':
          cleanup(build);
          break;
      }
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
    build.pull = {
      date: new Date().toISOString(),
      log: []
    };
    if (err) {
      logger.info(err);
      build.pull.log.push(JSON.stringify(err));
    }
    var extractLine = function (line, cb) {
      _.each(line.replace(/}{/g, '}}{{').split('}{'), function(line) {
        build.pull.log.push(line);
      });
      cb(null, line);
    };
    var finishPull = function() {
      build.runStage = 'run';
      build.pull.done = new Date().toISOString(),
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

  var commandSpec = [
    'sleep 5', // sleep so we have time to attach to the machine
    'uname -a', // always interesting
    'env',
    'echo "Using DISTDIR /var/lib/ogc/dist/global/dist"',
    'DISTDIR="/var/lib/ogc/dist/global/dist" emerge-webrsync -q', // update portage tree
    'echo "---- READING NEWS ----"', // some context to parse out news
    'eselect news read --raw new',
    'echo "---- DONE READING NEWS ----"',
    'echo "Building @security with PKGDIR=/var/lib/ogc/dist/${HOSTNAME}/pkg and DISTDIR="/var/lib/ogc/dist/${HOSTNAME}/dist'.
    'USE="bindist" PKGDIR="/var/lib/ogc/dist/${HOSTNAME}/pkg" DISTDIR="/var/lib/ogc/dist/${HOSTNAME}/dist" emerge @security -q1 --buildpkg --color n --nospinner', // build sec packages
    'echo "Storing build artefacts"',
    'echo rsync -va /var/lib/ogc/dist/${HOSTNAME}/ rsync://'+options.storageRsyncHost+':'+options.storageRsyncPort+'/${HOSTNAME}', // display rsync cmd
    'rsync -va /var/lib/ogc/dist/${HOSTNAME}/ rsync://'+options.storageRsyncHost+':'+options.storageRsyncPort+'/${HOSTNAME}', // store them
    'echo "Installing gentoolkit with PORTAGE_BINHOST=http://"'+options.storageWebHost+':'+options.storageWebPort+'/global/',
    'USE="bindist" PORTAGE_BINHOST="http://'+options.storageWebHost+':'+options.storageWebPort+'/global/" emerge gentoolkit -q1 --buildpkg --usepkg --color n --nospinner', // grab glsa-check
    'glsa-check --nocolor --list all', // run glsa-check
    'echo Done'
  ];

  var containerSpec = {
    Image: build.image.name,
    name: build.image.name.replace(/\//, '_') + '-ogc',
    Tty: true,
    Cmd: ['bash', '-c', commandSpec.join('; ')]
  };
  docker.createContainer(containerSpec, function (err, container) {
    build.run = {
      date: new Date().toISOString(),
      log: []
    };
    if (err) {
      logger.info(err);
    }
    logger.info({image: build.image.name, build_id: build._id}, 'created container');
    container.start(function (err, data) {
      if (err) {
        logger.info(err);
      } else {
        logger.info({image: build.image.name, build_id: build._id}, 'started container')
      }
    });
    container.attach({stream: true, stdout: true, stderr: true}, function(err, stream) {
      if (err) {
        logger.info(err);
      }
      var extractLine = function (line, cb) {
        build.run.log.push(line);
        cb(null, line);
      };
      var finishRun = function() {
        build.runStage = 'report';
        build.run.done = new Date().toISOString();
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

  docker.getContainer(build.image.name.replace(/\//, '_') + '-ogc').remove(function (err, data) {
    if (err) { logger.info(err) }
    logger.info({image: build.image.name, build_id: build._id}, 'finished cleanup');
    build.clean = {
      date: new Date().toISOString(),
      log: []
    }

    build.runStage = 'done';
    build.needsRun = false;
    build.clean.log.push(data);
    build.clean.done = new Date().toISOString();
    saveBuild(build);
  });
}

function BuildWorker(config, underscore, apiClient, dockerCmd, eventStream, bunyan) {
  options = config;
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
