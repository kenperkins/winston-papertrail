/*
 * papertrail-test.js: Tests for instances of the Papertrail transport
 *
 * (C) 2012 Ken Perkins
 * MIT LICENSE
 *
 */

// TODO still some work to get these working...

var path = require('path'),
    vows = require('vows'),
    assert = require('assert'),
    winston = require('winston'),
    helpers = require('winston/test/helpers'),
    Papertrail = require('../lib/winston-papertrail').Papertrail;

function assertPapertrail (transport) {
  assert.instanceOf(transport, Papertrail);
  assert.isFunction(transport.log);
};

var transport = new Papertrail();

vows.describe('winston-papertrail').addBatch({
 "An instance of the Papertrail Transport": {
   "should have the proper methods defined": function () {
       assertPapertrail(transport);
   },
   "the log() method": helpers.testNpmLevels(transport, "should log messages to papertrail", function (ign, err, meta, result) {
     assert.isTrue(!err);
     assert.isObject(result);
   })
 }
}).export(module);