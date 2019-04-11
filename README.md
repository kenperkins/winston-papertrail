# winston-papertrail [![Build Status](https://secure.travis-ci.org/kenperkins/winston-papertrail.png?branch=master)](http://travis-ci.org/kenperkins/winston-papertrail) [![NPM version](https://badge.fury.io/js/winston-papertrail.png)](http://badge.fury.io/js/winston-papertrail)

A Papertrail transport for [winston][0].

## Installation

### Installing npm (node package manager)

``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing winston-papertrail

``` bash
  $ npm install winston
  $ npm install winston-papertrail
```

There are a few required options for logging to Papertrail:

* __host:__ FQDN or IP Address of the Papertrail Service Endpoint
* __port:__ The Endpoint TCP Port


## Usage
```js
const winston = require('winston');
const { PapertrailConnection, PapertrailTransport } = require('winston-papertrail');

const papertrailConnection = new PapertrailConnection({
  host: 'logs.papertrailapp.com',
  port: 12345
})

papertrailConnection.on('error', function(err) {
  // Handle, report, or silently ignore connection errors and failures
});

const logger = new winston.createLogger({
  transports: [ new PapertrailTransport(papertrailConnection) ]
});

logger.info('this is my message');
```

There are a number of optional settings:

- `disableTls` - set to `true` to disable TLS on your transport. Defaults to `false`
- `level` - The log level to use for this transport, defaults to `info`
- `levels` - A custom mapping of log levels strings to severity levels, defaults to the mapping of `npm` levels to RFC5424 severities
- `hostname` - The hostname for your transport, defaults to `os.hostname()`
- `program` - The program for your transport, defaults to `default`
- `facility` - The syslog facility for this transport, defaults to `daemon`
- `logFormat` - A function to format your log message before sending, see below
- `colorize` - Enable colors in logs, defaults to `false`
- `inlineMeta` - Inline multi-line messages, defaults to `false`
- `handleExceptions` - Tell this Transport to handle exceptions, defaults to `false`
- `flushOnClose` - Flush any queued logs prior to closing/exiting
- `depth` - max depth for objects dumped by NodeJS `util.inspect`

There are also a number of settings for connection failure and retry behavior

- `attemptsBeforeDecay` - How many retries should be attempted before backing off, defaults to `5`
- `maximumAttempts` - How many retries before disabling buffering, defaults to `25`
- `connectionDelay` - How long between backoff in milliseconds, defaults to `1000`
- `maxDelayBetweenReconnection` - The maximum backoff in milliseconds, defaults to `60000`
- `maxBufferSize` - The maximum size of the retry buffer, in bytes, defaults to `1048576`

## Advanced Usage

For more some advanced logging, you can take advantage of custom formatting for
Papertrail:

```js
const logger = winston.createLogger({
  transports: [
    new PapertrailTransport(connection, {
      logFormat: function(level, message) {
          return '<<<' + level + '>>> ' + message;
      }
    })
  ]
});

logger.info('this is my message');
```

## Transport Events

`PapertrailConnection` is also capable of emitting events for `error` and `connect` so you can log to other transports:

```js
papertrailConnection.on('error', err => {
  // Do something with the error
});

papertrailConnection.on('connect', () => {
  // Do something after the connection to the Papertrail server is established
})
```

### Colorization

The `winston-papertrail` transport supports colorization with `winston`. Currently, the ANSI codes used for escape sequences are part of the search index, so please be advised when using colorization.

```Javascript
const logger = winston.createLogger({
  transports: [
    new PapertrailTransport(connection, {
      colorize: true
    })
  ]
});

logger.info('Hello from colorized winston');
```

### Closing the transport

`winston-papertrail` transport supports closing the transport (and the underlying TLS connection) via the `PapertrailConnection#close` method. Thus, you can enable scenarios where your transport automatically closes when you close the `winston` logger.

```Javascript
const winston = require('winston');
const { PapertrailConnection, PapertrailTransport } = require('winston-papertrail');

const papertrailConnection = new PapertrailConnection({
  host: 'logs.papertrailapp.com',
  port: 12345
});

const logger = new winston.createLogger({
  transports: [ new PapertrailTransport(papertrailConnection) ]
});

papertrailConnection.on('connect', function() {
    logger.info('logging before I close');
    logger.close(); // This also closes the underlying connection in the Papertrail transport
});
```

#### Author: [Ken Perkins](https://twitter.com/kenperkins)

[0]: https://github.com/flatiron/winston
