/*
 * winston-papertrail.js:
 *          Transport for logging to Papertrail Service
 *          (Special thanks to Charlie Robbins)
 *          www.papertrailapp.com
 *
 * (C) 2012 Ken Perkins
 * MIT LICENCE
 *
 */
 
var os = require('os'),
    tls = require('tls'),
    util = require('util'),
    winston = require('winston');

//
// ### function Papertrail (options)
// Constructor for the Papertrail transport object.
//
var Papertrail = exports.Papertrail = function(options) {

    var self = this;
    options = options || {};

    self.name = 'Papertrail';
    self.level = options.level || 'info';

    // Papertrail Service Host
    self.host = options.host;

    // Papertrail Service Port
    self.port = options.port;

    // Hostname of the current app
    self.hostname = options.hostname || os.hostname();

    // Program is an affordance for Papertrail to name the source of log entries
    self.program = options.program || 'default';

    // Papertrail enables alerts on search matching. Prodiving a decorator for the level
    // makes these searches more specific
    self.levelDecorators = options.levelDecorators || ['[', ']'];

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

    // Inline meta flag
    self.inlineMeta = options.inlineMeta || false;

    self.currentRetries = 0;
    self.totalRetries = 0;
    self.buffer = '';
    self.loggingEnabled = true;

    // Error out if we don't have a host or port
    if (!self.host || !self.port) {
        throw new Error('Missing required parameters: host and port');
    }

    // Open the connection
    try {
        connectStream();
    }
    catch (e) {
        // TODO figure out a better way of sending errors from connection
        self.emit('error', e);
    }

    // Opens a connection to Papertrail
    function connectStream() {
        self.stream = tls.connect(self.port, self.host, {}, onConnected);

        self.stream.on('error', function(err) {
            self.emit('error', err);

            // Papertrail has a bug that periodically resets their logging
            // services thus disconnecting your transport. We use setTimeout
            // to throttle the reconnection attempts in case Papertrail is
            // truly offline

            setTimeout(function() {

                // Increment our retry counts
                self.currentRetries++;
                self.totalRetries++;

                // Decay the retry rate exponentially up to max between attempts
                if ((self.connectionDelay < self.maxDelayBetweenReconnection) &&
                    (self.currentRetries >= self.attemptsBeforeDecay)) {
                    self.connectionDelay = self.connectionDelay * 2;
                    self.currentRetries = 0;
                }

                connectStream();

                // Stop buffering messages after a fixed number of retries.
                // This is to keep the buffer from growing unbounded
                if (self.loggingEnabled &&
                    (self.totalRetries >= (self.maximumAttempts))) {
                    self.loggingEnabled = false;
                    self.emit('error', new Error('Max entries eclipsed, disabling buffering'));
                }

            }, self.connectionDelay);
        });

        // If we have the stream end, simply reconnect
        self.stream.on('end', function() {
            connectStream();
        });
    }

    function onConnected() {
        // Reset our variables
        self.loggingEnabled = true;
        self.currentRetries = 0;
        self.totalRetries = 0;
        self.connectionDelay = 1000;

        // Did we get messages buffered
        if (self.buffer) {
            self.stream.write(self.buffer);
            self.buffer = '';
        }
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

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
Papertrail.prototype.log = function(level, msg, meta, callback) {
    // If the logging buffer is disabled, drop the message on the floor
    if (!this.loggingEnabled) {
        return callback(null, true);
    }

    var decoratedLevel = this.levelDecorators[0] + level + this.levelDecorators[1],
        output = msg;

    if (meta) {
        if (typeof meta !== 'object') {
            output += ' ' + meta;
        }
        else {
            if (this.inlineMeta) {
                output += ' ' + util.inspect(meta).replace(/[\n\t]/gm, " ");
            } 
            else {
                output += '\n' + util.inspect(meta);
            }
        }
    }

    this.sendMessage(this.hostname, this.program, decoratedLevel, output);

    callback(null, true);
};

//
// ### function sendMessage (hostname, program, level, message)
// #### @hostname {string} Hostname of the source application.
// #### @program {string} Name of the source application
// #### @level {string} Log level to send
// #### @message {string} Actual log message
// Handles sending the message to the stream, or buffering if not
//
Papertrail.prototype.sendMessage = function(hostname, program, level, message) {

    var lines = [],
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
    // line as it's own message
    for (var i = 0; i < lines.length; i++) {

        // don't send extra message if our message ends with a newline
        if (lines[i].length == 0 && i == lines.length - 1) {
            break;
        }

        if (i == 1) {
            gap = '    ';
        }

        msg += "<25> " +
            getDate() + ' ' +
            hostname + ' ' +
            program + ' ' +
            level + ' ' +
            gap + lines[i] + '\r\n';
    }

    if (this.stream && this.stream.writable) {
        this.stream.write(msg);
    }
    else if (this.loggingEnabled) {
        this.buffer += msg;
    }
};

function getDate() {
    var d = new Date();
    return d.toLocaleString().split(' ')[1] + ' ' +
        pad2(d.getDate()) + ' ' +
        pad2(d.getHours()) + ':' +
        pad2(d.getMinutes()) + ':' +
        pad2(d.getSeconds());
}

function pad2(number) {
    return (number < 10 ? '0' : '') + number;
}
