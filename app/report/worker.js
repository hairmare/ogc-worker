"use strict";

var _ = {}, api = {};

var saveAction = function(event) {
  api.get(event['$ref'], function (req, res, build) {
    if (build.runStage == 'report') {
      generateReport(build);
    } else {
      console.log("Nothing to do for " + build.image.name + "/" + build._id);
    }
  });
};

function generateReport(build) {
  console.log('generating report for '+build.image.name+'/'+build._id);
  console.log(build);

  build.report = {
    date: Date.now
  }

  build.report.log = build.run.log.filter(function(item) {
    return /^[0-9]{6}-[0-9]{2} \[[AIU]\] /.test(item);
  });

  build.runStage = 'clean';
  build.report.done = Date.now;
  api.put('/builds/' + build._id, build, function(req, res, obj) {
    console.log("Saving build " + build.image.name);
  });
}

function worker(underscore, apiClient) {
  _ = underscore;
  api = apiClient;
  return {
    save: function() {
      return saveAction;
    }
  }
}

module.exports = worker;
