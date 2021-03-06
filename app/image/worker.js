"use strict";

var _ = {}, api = {}, docker = {}, logger = {};

var saveAction = function(event) {
  api.get(event['$ref'], function (req, res, image) {

    logger.info({image: image.name}, "save trigger");
    if (image.syncHub) {
      updateImageFromHub(image);
    } else if (image.needsBuild) {
      triggerBuild(image);
    }
  });
};

function updateImageFromHub(image) {
  docker.searchImages({term: image.name}, function(err, images) {
    var hubImage = _.find(images, function(item, name) {
      return item.name == image.name;
    });
    image.syncHub = false;
    image.hub = hubImage;
    api.put('/images/' + image._id, image, function(req, res, obj) {
      logger.info({image: image.name}, 'updated from hub');
    });
  });
}

function triggerBuild(image) {
  api.post('/builds', {image: { $ref: '/images/' + image._id, _id: image._id, name: image.name } }, function(req, res, build) {
    logger.info({image: image.name, build_id: build._id}, 'triggered build')
    image.needsBuild = false;
    image.recentBuilds.push({
      _id: build._id,
      date: build.date,
      $ref: '/builds/' + build._id
    });
    api.put('/images/' + image._id, image, function(req, res, obj) {
      logger.info({image: image.name, build_id: build._id}, 'linked build to image');
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
