"use strict";

function client(options, restify, assert) {
  var client = restify.createJsonClient({
    url: options.api.url,
    version: options.api.version
  });
  return {
    _client: client,
    get: function(obj, callback) {
      client.get(obj, function (err, req, res, obj) {
        assert.ifError(err);
        callback(req, res, obj);
      });
    },
    post: function(id, obj, callback) {
      client.post(id, obj, function (err, req, res, obj) {
        assert.ifError(err);
        callback(req, res, obj);
      });
    },
    put: function(id, obj, callback) {
      client.put(id, obj, function (err, req, res, obj) {
        assert.ifError(err);
        callback(req, res, obj);
      });
    }
  }
}

module.exports = client;
