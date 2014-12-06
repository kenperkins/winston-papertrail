/*
 * papertrail-test.js: Tests for instances of the Papertrail transport
 *
 * (C) 2014 Ken Perkins
 * MIT LICENSE
 *
 */

// TODO still some work to get these working...

var path = require('path'),
  should = require('should'),
  fs = require('fs'),
  winston = require('winston'),
  net = require('net'),
  tls = require('tls'),
  Papertrail = require('../lib/winston-papertrail').Papertrail;

describe('connection tests', function() {

  describe('invalid connections', function() {
    it('should fail to connect', function (done) {
      var pt = new Papertrail({
        host: 'this.wont.resolve',
        port: 12345 // your port here
      });

      pt.on('error', function (err) {
        should.exist(err);
        done();
      });
    });

    it.skip('should timeout', function (done) {
      var pt = new Papertrail({
        host: '8.8.8.8', // TODO Figure out how to enable a timeout test
        port: 12345
      });

      pt.on('error', function (err) {
        should.exist(err);
        done();
      });
    });
  });

  describe('valid connection', function() {

    var server, listener = function() {};

    before(function(done) {
      server = tls.createServer({
        key: fs.readFileSync('./test/server.key'),
        cert: fs.readFileSync('./test/server.crt'),
        rejectUnauthorized: false
      }, function (socket) {
        socket.on('data', listener);
      });

      server.listen(23456, function() {
        done();
      });
    });

    it('should connect', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        done();
      });
    });

    it('should send message', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        pt.log('info', 'hello', function() {

        });
      });

      listener = function(data) {
        should.exist(data);
        data.toString().indexOf('default info hello\r\n').should.not.equal(-1);
        done();
      }
    });

    after(function(done) {
      server.close();
      done();
    });
  });

});


