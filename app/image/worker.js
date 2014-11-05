"use strict";

var _ = {}, api = {}, docker = {};

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
      console.log("updated " + image._id + " with hub data");
    });
  });
}

function triggerBuild(image) {
  api.post('/builds', {image: { $ref: '/images/' + image._id, name: image._id } }, function(req, res, obj) {
    console.log("triggered build " + obj._id + " for " + image._id);
  });
}

function ImageWorker(underscore, apiClient, dockerCmd) {
  _ = underscore;
  api = apiClient;
  docker = dockerCmd;
  return {
    save: function() {
      return saveAction;
    }
  }
}

module.exports = ImageWorker;
