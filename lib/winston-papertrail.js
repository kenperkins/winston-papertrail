/**
 * winston-papertrail.js
 *
 * Transport for logging to Papertrail service
 * https://papertrailapp.com/
 *
 * Based on a previous version (1.x) by Ken Perkins.
 */

const Transport = require('winston-transport');
const syslogProducer = require('glossy').Produce;
const net = require('net');
const os = require('os');
const tls = require('tls');
const util = require('util');

const KEEPALIVE_INTERVAL = 15 * 1000;

class PapertrailConnection {
  constructor(options) {
    const { host, port } = options;

    this.host = host;
    this.port = port;
    this.buffer = '';

    /**
     * Dev could instantiate a new logger and then call logger.log immediately.
     * We need a way to put incoming strings (from multiple transports) into
     * a buffer queue.
     */
    this.deferredQueue = [];

    this.connect();
  }

  close() {}

  connect() {
    const socket = net.createConnection(this.port, this.host, () => {
      socket.setKeepAlive(true, KEEPALIVE_INTERVAL);

      this.stream = tls.connect(
        {
          socket,
          rejectUnauthorized: false,
        },
        () => {
          while (this.deferredQueue.length > 0) {
            const item = this.deferredQueue.shift();
            this.stream.write(item.buffer, item.callback);
          }
        }
      );
      // this.stream.once('error', onErrored);

      // Reconnect if the connection drops
      this.stream.once('end', this.connect);
    });
  }

  write(text, callback) {
    // If the stream is writable
    if (this.stream && this.stream.writable) {
      this.stream.write(text, callback);
    } else {
      // Otherwise, store it in a buffer and write it when we're connected
      this.deferredQueue.push({
        buffer: text,
        callback,
      });
    }
  }
}

class PapertrailTransport extends Transport {
  constructor(options) {
    super(options);

    this.connection = options.connection;
    this.colorize = options.colorize;
    this.hostname = options.hostname || os.hostname();
    this.program = options.program;
    this.logFormat =
      options.logFormat ||
      function(level, message) {
        return level + ' ' + message;
      };
    this.depth = options.depth || null;
    this.facility = options.facility || 'daemon';
    this.producer = new syslogProducer({ facility: this.facility });
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // write to Papertrail
    let { level, message, meta } = info;
    let output = message;

    if (meta) {
      if (typeof meta !== 'object') {
        output += ' ' + meta;
      } else if (meta) {
        if (this.inlineMeta) {
          output +=
            ' ' +
            util
              .inspect(meta, false, this.depth, this.colorize)
              .replace(/[\n\t]\s*/gm, ' ');
        } else {
          output += '\n' + util.inspect(meta, false, this.depth, this.colorize);
        }
      }
    }

    this.sendMessage(level, output, callback);
  }

  sendMessage(level, message, callback) {
    let lines = [];
    let msg = '';
    let gap = '';

    // Only split if we actually have a message
    if (message) {
      lines = message.split('\n');
    } else {
      lines = [''];
    }

    // If the incoming message has multiple lines, break them and format each
    // line as its own message
    for (let i = 0; i < lines.length; i++) {
      // don't send extra message if our message ends with a newline
      if (lines[i].length === 0 && i === lines.length - 1) {
        break;
      }

      if (i === 1) {
        gap = '    ';
      }

      // Strip escape characters (for colorization)
      const cleanedLevel = level.replace(/\u001b\[\d+m/g, '');
      msg +=
        this.producer.produce({
          severity: this.levels[cleanedLevel] || cleanedLevel,
          host: this.hostname,
          appName: this.program,
          date: new Date(),
          message: this.logFormat(level, gap + lines[i]),
        }) + '\r\n';
    }

    this.connection.write(msg, callback);
  }
}

module.exports = { PapertrailConnection, PapertrailTransport };
