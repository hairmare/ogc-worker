"use strict";

var _ = {}, api = {}, docker = {}, logger = {};

var saveAction = function(event) {
  api.get(event['$ref'], function (req, res, image) {

    if (image.syncHub) {
      updateImageFromHub(image);
    } else if (image.needsBuild) {
      triggerBuild(image);
    }
  });
};

function updateImageFromHub(image) {
  docker.searchImages({term: image._id}, function(err, images) {
    var hubImage = _.find(images, function(item, name) {
      return item.name == image._id;
    });
    image.syncHub = false;
    image.hub = hubImage;
    api.put('/images/' + image._id, image, function(req, res, obj) {
      logger.info({image: image._id}, 'updated from hub');
    });
  });
}

function triggerBuild(image) {
  api.post('/builds', {image: { $ref: '/images/' + image._id, name: image._id } }, function(req, res, build) {
    logger.info({image: image._id build_id; build._id}, 'triggered build')
    image.needsBuild = false;
    image.recentBuilds.push({
      _id: build._id,
      date: build.date
    });
    api.put('/images/' + image._id, image, function(req, res, obj) {
      logger.info({image: image._id, build_id: build._id}, 'linked build to image');
    });
  });
}

function ImageWorker(underscore, apiClient, dockerCmd, bunyan) {
  _ = underscore;
  api = apiClient;
  docker = dockerCmd;
  logger = bunyan;
  return {
    save: function() {
      return saveAction;
    }
  }
}

module.exports = ImageWorker;
