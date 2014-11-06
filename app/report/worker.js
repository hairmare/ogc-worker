"use strict";

var _ = {}, api = {}, logger = {};

var saveAction = function(event) {
  api.get(event['$ref'], function (req, res, build) {
    if (build.runStage == 'report') {
      generateReport(build);
    } else {
      logger.info({image: build.image.name, build_id: build._id}, 'nothing to do');
    }
  });
};

function generateReport(build) {
  logger.info({image: build.image.name, build_id: build._id}, 'generating report');

  build.report = {
    date: Date.now
  }

  build.report.log = build.run.log.filter(function(item) {
    return /^[0-9]{6}-[0-9]{2} \[[AIU]\] /.test(item);
  });

  build.runStage = 'clean';
  build.report.done = Date.now;
  api.put('/builds/' + build._id, build, function(req, res, obj) {
    logger.info({image: build.image.name, build_id: build._id}, 'saving build');
  });
}

function worker(underscore, apiClient, bunyan) {
  _      = underscore;
  api    = apiClient;
  logger = bunyan;
  return {
    save: function() {
      return saveAction;
    }
  }
}

module.exports = worker;
