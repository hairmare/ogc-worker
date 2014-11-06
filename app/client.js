"use strict";

function client(options, restify, logger) {
  var client = restify.createJsonClient({
    url: 'http://'+options.apiHost+':'+options.apiPort,
    version: '^0.0.1'
  });
  return {
    _client: client,
    get: function(obj, callback) {
      client.get(obj, function (err, req, res, obj) {
        logger.info(err);
        callback(req, res, obj);
      });
    },
    post: function(id, obj, callback) {
      client.post(id, obj, function (err, req, res, obj) {
        logger.info(err);
        callback(req, res, obj);
      });
    },
    put: function(id, obj, callback) {
      client.put(id, obj, function (err, req, res, obj) {
        logger.info(err);
        callback(req, res, obj);
      });
    }
  }
}

module.exports = client;
