"use strict";

function events(ee, model) {
  ee.on('/build/save', model.save());
}

module.exports = events;
