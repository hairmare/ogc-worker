"use strict";

function events(ee, model) {
  ee.on('/image/save', model.save());
}

module.exports = events;
