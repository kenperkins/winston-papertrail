/*
 * winston-papertrail.js:
 *
 *          Transport for logging to Papertrail Service
 *          www.papertrailapp.com
 *
 * (C) 2013 Ken Perkins
 * MIT LICENCE
 *
 */

var os = require('os'),
    net = require('net'),
    tls = require('tls'),
    syslogProducer = require('glossy').Produce,
    util = require('util'),
    winston = require('winston');

/**
 * Papertrail class
 *
 * @description constructor for the Papertrail transport
 *
 * @param {object}      options                 options for your papertrail transport
 *
 * @param {string}      options.host            host for papertrail endpoint
 *
 * @param {Number}      options.port            port for papertrail endpoint
 *
 * @param {Boolean}     [options.disableTls]    disable TLS connections, enabled by default
 *
 * @param {string}      [options.hostname]      name for the logging hostname in Papertrail
 *
 * @param {string}      [options.program]       name for the logging program
 *
 * @param {string}      [options.facility]      syslog facility for log messages
 *
 * @param {string}      [options.level]         log level for your transport (info)
 *
 * @param {string}      [options.levels]        custom mapping of log levels (npm levels to RFC5424 severities)
 *
 * @param {Function}    [options.logFormat]     function to format your log message before sending
 *
 * @param {Number}      [options.attemptsBeforeDecay]       how many reconnections should
 *                                                          be attempted before backing of (5)
 *
 * @param {Number}      [options.maximumAttempts]           maximum attempts before
 *                                                          disabling buffering (25)
 *
 * @param {Number}      [options.connectionDelay]           delay between
 *                                                          reconnection attempts in ms (1000)
 *
 * @param {Boolean}     [options.handleExceptions]          passed to base Transport (false)
 *
 * @param {Boolean}     [options.colorize]                  enable colors in Papertrail (false)
 * 
 * @param {Number}      [options.depth]                     max depth for objects dumped by NodeJS util.inspect
 *
 * @param {Number}      [options.maxDelayBetweenReconnection]   when backing off,
 *                                                              what's the max time between
 *                                                              reconnections (ms)
 *
 * @param {Boolean}     [options.inlineMeta]        inline multi-line messages (false)
 *
 * @param {Boolean}     [options.flushOnClose]      send remaining messages before closing (false)
 *
 * @type {Function}
 */
var Papertrail = exports.Papertrail = function (options) {

    var self = this;
    winston.Transport.call(self, options);

    self._KEEPALIVE_INTERVAL = 15 * 1000;

    options = options || {};

    self.name = 'Papertrail';
    self.level = options.level || 'info';

    self.depth = options.depth || null;

    // Default npm log levels
    self.levels = options.levels || {
        silly: 7,
        debug: 7,
        verbose: 7,
        info: 6,
        warn: 4,
        error: 3
    };

    // Papertrail Service Host
    self.host = options.host;

    // Papertrail Service Port
    self.port = options.port;

    // Disable TLS connections (enabled by default)
    self.disableTls = typeof options.disableTls === 'boolean' ? options.disableTls : false;

    // Hostname of the current app
    self.hostname = options.hostname || os.hostname();

    // Program is an affordance for Papertrail to name the source of log entries
    self.program = options.program || 'default';

    // Syslog facility to log messages as to Papertrail
    self.facility = options.facility || 'daemon';

    // Send ANSI color codes through to Papertrail
    self.colorize = options.colorize || false;

    // Format your log messages prior to delivery
    self.logFormat = options.logFormat || function (level, message) {
        return level + ' ' + message;
    };

    // Number of attempts before decaying reconnection
    self.attemptsBeforeDecay = options.attemptsBeforeDecay || 5;

    // Maximum number of reconnection attempts before disabling buffer
    self.maximumAttempts = options.maximumAttempts || 25;

    // Delay between normal attempts
    self.connectionDelay = options.connectionDelay || 1000;

    // Handle Exceptions
    self.handleExceptions = options.handleExceptions || false;

    // Maximum delay between attempts
    self.maxDelayBetweenReconnection =
        options.maxDelayBetweenReconnection || 60000;

    // Maximum buffer size (default: 1MB)
    self.maxBufferSize =
        options.maxBufferSize || 1 * 1024 * 1024;

    // Inline meta flag
    self.inlineMeta = options.inlineMeta || false;

	self.flushOnClose = options.flushOnClose || false;

    self.producer = new syslogProducer({ facility: self.facility });

    self.currentRetries = 0;
    self.totalRetries = 0;
    self.buffer = '';
    self.loggingEnabled = true;
    self._shutdown = false;

    // Error out if we don't have a host or port
    if (!self.host || !self.port) {
        throw new Error('Missing required parameters: host and port');
    }

    // Open the connection
    connectStream();

    function cleanup() {
        self._erroring = true;
        try {
            if (self.socket) {
                self.socket.destroy();

                //this throws some uncatchable thing, eww.
                //self.socket.end();
                self.socket = null;
            }
        }
        catch (e) { }

        try {
            if (self.stream) {
                //we're cleaning up, don't loop.
                self.stream.removeListener('end', connectStream);
                self.stream.removeListener('error', onErrored);

                self.stream.destroy();
                self.stream = null;
            }
        }
        catch (e) { }
        self._erroring = false;
    }

    function wireStreams() {
        self.stream.once('error', onErrored);

        // If we have the stream end, simply reconnect
        self.stream.once('end', connectStream);
    }

    // Opens a connection to Papertrail
    function connectStream() {
        // don't connect on either error or shutdown
        if (self._shutdown || self._erroring) {
            return;
        }

        cleanup();

        try {
            if (self.disableTls) {
                self.stream = net.createConnection(self.port, self.host, onConnected);
                self.stream.setKeepAlive(true, self._KEEPALIVE_INTERVAL);

                wireStreams();
            }
            else {
                var socket = net.createConnection(self.port, self.host, function () {
                    socket.setKeepAlive(true, self._KEEPALIVE_INTERVAL);

                    self.stream = tls.connect({
                        socket: socket,
                        rejectUnauthorized: false
                    }, onConnected);

                    wireStreams();
                });

                socket.on('error', onErrored);
                self.socket = socket;
            }
        }
        catch (e) {
            onErrored(e);
        }
    }
    self._reconnectStream = connectStream;

    function onErrored(err) {
        // make sure we prevent simultaneous attempts to connect and handle errors
        self._erroring = true;

		self._silentErrorEmitter(err);

        // We may be disconnected from the papertrail endpoint for any number of reasons;
        // i.e. inactivity, network problems, etc, and we need to be resilient against this
        // that said, we back off reconnection attempts in case Papertrail is truly down
        setTimeout(function () {
            // Increment our retry counts
            self.currentRetries++;
            self.totalRetries++;

            // Decay the retry rate exponentially up to max between attempts
            if ((self.connectionDelay < self.maxDelayBetweenReconnection) &&
            (self.currentRetries >= self.attemptsBeforeDecay)) {
                self.connectionDelay = self.connectionDelay * 2;
                self.currentRetries = 0;
            }

            // Stop buffering messages after a fixed number of retries.
            // This is to keep the buffer from growing unbounded
			if (self.loggingEnabled && (self.totalRetries >= (self.maximumAttempts)))
			{
				self.loggingEnabled = false;
				self._silentErrorEmitter(new Error('Max entries eclipsed, disabling buffering'));
			}

            // continue
            self._erroring = false;
            connectStream();

        }, self.connectionDelay);
    }

    function onConnected() {
		// Reset our variables
		self.loggingEnabled = true;
		self.currentRetries = 0;
		self.totalRetries = 0;
		self.connectionDelay = options.connectionDelay || 1000;

		self.emit('connect', 'Connected to Papertrail at ' + self.host + ':' + self.port);

		self.processBuffer();
	}
};

//
//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(Papertrail, winston.Transport);

//
// Define a getter so that `winston.transports.Papertrail`
// is available and thus backwards compatible.
//
winston.transports.Papertrail = Papertrail;

/**
 * Papertrail.log
 *
 * @description Core logging method exposed to Winston. Metadata is optional.
 *
 * @param {String}        level    Level at which to log the message.
 * @param {String}        msg        Message to log
 * @param {String|object|Function}        [meta]    Optional metadata to attach
 * @param {Function}    callback
 * @returns {*}
 */
Papertrail.prototype.log = function (level, msg, meta, callback) {

    var self = this;

    // make sure we handle when meta isn't provided
    if (typeof(meta) === 'function' && !callback) {
        callback = meta;
        meta = false;
    }

    if (meta && typeof meta === 'object' && (Object.keys(meta).length === 0)
        && (!util.isError(meta))) {
        meta = false;
    }

    // If the logging buffer is disabled, drop the message on the floor
    if (!this.loggingEnabled) {
        return callback(null, true);
    }

    var output = msg;

    // If we don't have a string for the message,
    // lets transform it before moving on
    if (typeof(output) !== 'string') {
        output = util.inspect(output, false, self.depth, self.colorize);
    }

    if (meta) {
        if (typeof meta !== 'object') {
            output += ' ' + meta;
        }
        else if (meta) {
            if (this.inlineMeta) {
                output += ' ' + util.inspect(meta, false, self.depth, self.colorize).replace(/[\n\t]\s*/gm, " ");
            }
            else {
                output += '\n' + util.inspect(meta, false, self.depth, self.colorize);
            }
        }
    }

    this.sendMessage(this.hostname, this.program, level, output, callback);

};

/**
 * Papertrail.sendMessage
 *
 * @description sending the message to the stream, or buffering if not connected
 *
 * @param {String}    hostname    Hostname of the source application.
 * @param {String}    program     Name of the source application
 * @param {String}    level        Log level of the message
 * @param {String}    message        The message to deliver
 * @param {Function}  callback      callback to be executed when the log has been written to the stream
 */
Papertrail.prototype.sendMessage = function (hostname, program, level, message, callback) {

    var self = this,
        lines = [],
        msg = '',
        gap = '';

    // Only split if we actually have a message
    if (message) {
        lines = message.split('\n');
    }
    else {
        lines = [''];
    }

    // If the incoming message has multiple lines, break them and format each
    // line as its own message
    for (var i = 0; i < lines.length; i++) {

        // don't send extra message if our message ends with a newline
        if ((lines[i].length === 0) && (i == lines.length - 1)) {
            break;
        }

        if (i == 1) {
            gap = '    ';
        }

        msg += self.producer.produce({
            severity: self.levels[level] ? self.levels[level] : level,
            host: hostname,
            appName: program,
            date: new Date(),
            message: self.logFormat(self.colorize ? winston.config.colorize(level) : level, gap + lines[i])
        }) + '\r\n';
    }

    if (this.stream && this.stream.writable) {
		this.processBuffer();
		this.stream.write(msg, callback);
    }
    else if (this.loggingEnabled && this.buffer.length < this.maxBufferSize) {
        this.buffer += msg;
    }
};

/**
 * If we have anything buffered, try to write it to the stream if we can before we log new messages
 */
Papertrail.prototype.processBuffer = function() {
	var self = this;

	// Did we have buffered messages?
	if (this.buffer.length <= 0) {
		return;
	}

	// Is the stream writable?
	if (!this.stream || !this.stream.writable) {
		return;
	}

	this.stream.write(this.buffer, function() {
		if (!self.buffer.length) {
			self.stream.emit('empty');
		}
	});
	this.buffer = '';
};

/**
 * Papertrail.close
 *
 * @description closes the underlying TLS connection and disables automatic
 * reconnection, allowing the process to exit
 */
Papertrail.prototype.close = function() {
    var self = this;

    self._shutdown = true;

	if (self.stream) {
		if (self.flushOnClose && self.buffer.length) {
			self.stream.on('empty', function() {
				// TODO: some kind of guard here to avoid infinite recursion?
				self.close();
			});
		}
		else {
			self.stream.end();
		}
	}

    // if there's no stream yet, that means we're still connecting
    // lets wire a connect handler, and then invoke close again
    else {
        self.on('connect', function() {
            self.close();
        });
    }
};

/**
 * The goal here is to ignore connection errors by default without triggering an uncaughtException.
 * You can still bind your own error handler as normal, but if you haven't overridden it, connection errors
 * will be logged to the console by default.
 *
 * Notes: This is meant to fix usability issues #20, and #49
 *
 * @param err
 * @private
 */
Papertrail.prototype._silentErrorEmitter = function(err) {
	var count = this.listeners('error').length;
	if (count > 0) {
		// the goal here is to ensure someone is catching this event, instead of potentially
		// causing the process to exit.
		this.emit('error', err);
	}
	else {
		console.error('Papertrail connection error: ', err);
	}
};
