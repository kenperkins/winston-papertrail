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
        port: 12345,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.exist(err);
        done();
      });
    });

    it('should not exit process when it fails to connect', function (done) {
      var pt = new Papertrail({
        host: 'this.wont.resolve',
        port: 12345,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

		// NOTE!  We intentionally left off the error handler here, this proves
		// the process won't exit on a connection error.

		setTimeout(function() {
			done();
		}, 125);
    });

    it.skip('should timeout', function (done) {
      var pt = new Papertrail({
        host: '8.8.8.8', // TODO Figure out how to enable a timeout test
        port: 12345,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.exist(err);
        done();
      });
    });
  });

  describe('valid connection over tls', function() {

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
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        done();
      });
    });

    it('should connect a bunch without exploding', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 100
      });

      pt._reconnectStream();
      pt._reconnectStream();
      pt._reconnectStream();

      var someInterval = setInterval(pt._reconnectStream.bind(pt), 10);
      var connCount = 0;

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
          connCount++;
          if (connCount > 5) {
              clearInterval(someInterval);
              done();
          }

      });
    });

    it('should send message', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
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
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        done();
      }
    });

	  it('should write buffered events before new events', function(done) {
		  var pt = new Papertrail({
			  host: 'localhost',
			  port: 23456,
			  attemptsBeforeDecay: 0,
			  connectionDelay: 10000
		  });

		  pt.log('info', 'first', {}, function() {

		  });

		  pt.on('error', function(err) {
			  should.not.exist(err);
		  });

		  pt.on('connect', function() {
			  (function() {
				  pt.log('info', 'second', {}, function() {

				  });
			  }).should.not.throw();
		  });

		  var gotFirst = false;
		  listener = function(data) {
			  if (gotFirst) {
				  return;
			  }
			  should.exist(data);
			  var lines = data.toString().split('\r\n');
			  lines[0].should.match(/first/);
			  gotFirst = true;
			  done();
		  }
	  });

    it('should support object meta', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        (function () {
          pt.log('info', 'hello', { meta: 'object' }, function () {

          });
        }).should.not.throw();
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        data.toString().indexOf('object').should.not.equal(-1);
        done();
      }
    });

    it('should support array meta', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        (function () {
          pt.log('info', 'hello', ['object'], function () {

          });
        }).should.not.throw();
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        data.toString().indexOf('object').should.not.equal(-1);
        done();
      }
    });

    it('should support null meta', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        (function () {
          pt.log('info', 'hello', null, function () {

          });
        }).should.not.throw();
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        done();
      }
    });

    it('should support non-object meta', function(done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        (function() {
          pt.log('info', 'hello', 'meta object', function () {

          });
        }).should.not.throw();
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello meta object\r\n').should.not.equal(-1);
        done();
      }
    });

    // TODO need to fix the TLS Server to reject new sockets that are not over tls
    it.skip('should fail to connect without tls', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        disableTls: true,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.exist.exist(err);
        done();
      });
    });

      // creates a logger with flushOnClose and something buffered
	  // connects, then closes, ensure what we wanted was written.
	  it('flushOnClose should write buffered events before closing the stream', function(done) {
		  var pt = new Papertrail({
			  host: 'localhost',
			  port: 23456,
			  attemptsBeforeDecay: 0,
			  connectionDelay: 10000,
			  flushOnClose: true
		  });

		  pt.log('info', 'buffered', {}, function() {

		  });

		  pt.on('error', function(err) {
			  should.not.exist(err);
		  });

		  pt.on('connect', function() {
			  pt.close();
		  });

		  listener = function(data) {
			  should.exist(data);
			  var lines = data.toString().split('\r\n');
			  lines[0].should.match(/buffered/);
			  done();
		  }
	  });

    after(function(done) {
      server.close();
      done();
    });
  });


  describe('valid connection over tcp', function () {

    var server, listener = function () {
    };

    before(function (done) {
      server = net.createServer(function (socket) {
        socket.on('data', listener);
      });

      server.listen(23456, function () {
        done();
      });
    });

    it('should connect', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        disableTls: true,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
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
        port: 23456,
        disableTls: true,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        should.not.exist(err);
      });

      pt.on('connect', function () {
        pt.log('info', 'hello', function () {

        });
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        done();
      }
    });

    // TODO figure out how to get this to fail
    it.skip('should fail to connect via tls', function (done) {
      var pt = new Papertrail({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      pt.on('error', function (err) {
        throw err;
        should.exist.exist(err);
        done();
      });
    });

    after(function (done) {
      server.close();
      done();
    });
  });

});


