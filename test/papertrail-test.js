/*
 * papertrail-test.js: Tests for instances of the Papertrail transport
 *
 * (C) 2014 Ken Perkins
 * MIT LICENSE
 *
 */

// TODO still some work to get these working...

const path = require('path'),
  should = require('should'),
  fs = require('fs'),
  winston = require('winston'),
  net = require('net'),
  tls = require('tls'),
  { PapertrailConnection, PapertrailTransport } = require('../lib/winston-papertrail');

describe('connection tests', function() {
  describe('invalid connections', function() {
    it('should fail to connect', function (done) {
      const pt = new PapertrailConnection({
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
      const pt = new PapertrailConnection({
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
      const pt = new PapertrailConnection({
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
    let server, listener = function() {};

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
      const pt = new PapertrailConnection({
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

    // TODO Make this work
    it.skip('should connect a bunch without exploding', function (done) {
      const pt = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 100
      });

      pt.connect();
      pt.connect();
      pt.connect();

      const someInterval = setInterval(pt.connect.bind(pt), 10);
      let connCount = 0;

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
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      const pt = new PapertrailTransport(connection);

      connection.on('error', function (err) {
        should.not.exist(err);
      });

      connection.on('connect', function () {
        pt.log({
          level: 'info',
          message: 'hello'
        }, function() {

        });
      });

      listener = function(data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        done();
      }
    });

	  it('should write buffered events before new events', function(done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

		  const pt = new PapertrailTransport(connection);

		  pt.log({
        level: 'info',
        message: 'first'
      }, function() {

		  });

		  connection.on('error', function(err) {
			  should.not.exist(err);
		  });

		  connection.on('connect', function() {
        pt.log({
          level: 'info',
          message: 'second'
        }, function() {

        });
		  });

		  let gotFirst = false;
		  listener = function(data) {
			  if (gotFirst) {
				  return;
			  }
			  should.exist(data);
			  const lines = data.toString().split('\r\n');
			  lines[0].should.match(/first/);
			  gotFirst = true;
			  done();
		  }
	  });

    it('should support object meta', function (done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      const pt = new PapertrailTransport(connection);

      connection.on('error', function (err) {
        should.not.exist(err);
      });

      connection.on('connect', function () {
        pt.log({
          level: 'info',
          message: 'hello',
          meta: {
            foo: 'bar'
          }
        }, function () {

        });
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        data.toString().indexOf("{ foo: 'bar' }\r\n").should.not.equal(-1);
        done();
      }
    });

    it('should support array meta', function (done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      const pt = new PapertrailTransport(connection);

      connection.on('error', function (err) {
        should.not.exist(err);
      });

      connection.on('connect', function () {
        pt.log({
          level: 'info',
          message: 'hello',
          meta: [ 'object' ]
        }, function () {

        });
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello\r\n').should.not.equal(-1);
        data.toString().indexOf('object').should.not.equal(-1);
        done();
      }
    });

    it('should support null meta', function (done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      const pt = new PapertrailTransport(connection);

      connection.on('error', function (err) {
        should.not.exist(err);
      });

      connection.on('connect', function () {
        (function () {
          pt.log({
            level: 'info',
            message: 'hello',
            meta: null
          }, function () {

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
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      const pt = new PapertrailTransport(connection);

      connection.on('error', function (err) {
        should.not.exist(err);
      });

      connection.on('connect', function () {
        pt.log({
          level: 'info',
          message: 'hello',
          meta: 'meta string'
        }, function () {

        });
      });

      listener = function (data) {
        should.exist(data);
        data.toString().indexOf('default - - - info hello meta string\r\n').should.not.equal(-1);
        done();
      }
    });

    // TODO need to fix the TLS Server to reject new sockets that are not over tls
    it.skip('should fail to connect without tls', function (done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000,
        disableTls: true
      });

      connection.on('error', function (err) {
        should.exist.exist(err);
        done();
      });
    });

	  // connects, then closes, ensure what we wanted was written.
	  it('flushOnClose should write buffered events before closing the stream', function(done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000,
        flushOnClose: true,
      });

      const pt = new PapertrailTransport(connection);

      pt.log({
        level: 'info',
        message: 'buffered'
      }, function() {

      });

		  connection.close();

		  connection.on('error', function(err) {
			  should.not.exist(err);
		  });

		  connection.on('connect', function() {
			  connection.close();
		  });

		  listener = function(data) {
			  should.exist(data);
			  const lines = data.toString().split('\r\n');
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
    let server, listener = function () { };

    before(function (done) {
      server = net.createServer(function (socket) {
        socket.on('data', listener);
      });

      server.listen(23456, function () {
        done();
      });
    });

    it('should connect', function (done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        disableTls: true,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000,
      });

      connection.on('error', function (err) {
        console.trace(err);
        should.not.exist(err);
      });

      connection.on('connect', function () {
        done();
      });
    });

    it('should send message', function (done) {
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        disableTls: true,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000
      });

      const pt = new PapertrailTransport(connection);

      connection.on('error', function (err) {
        should.not.exist(err);
      });

      connection.on('connect', function () {
        pt.log({
          level: 'info',
          message: 'hello'
        }, function () {

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
      const connection = new PapertrailConnection({
        host: 'localhost',
        port: 23456,
        attemptsBeforeDecay: 0,
        connectionDelay: 10000,
      });

      connection.on('error', function (err) {
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


