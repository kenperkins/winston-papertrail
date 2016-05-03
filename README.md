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
``` js
  var winston = require('winston');

  //
  // Requiring `winston-papertrail` will expose
  // `winston.transports.Papertrail`
  //
  require('winston-papertrail').Papertrail;

  var logger = new winston.Logger({
  	transports: [
  		new winston.transports.Papertrail({
  			host: 'logs.papertrailapp.com',
  			port: 12345
  		})
  	]
  });

  logger.info('this is my message');
```

There are a number of optional settings:

- `disableTls` - set to `true` to disable TLS on your transport. Defaults to `false`
- `level` - The log level to use for this transport, defaults to `info`
- `hostname` - The hostname for your transport, defaults to `os.hostname()`
- `program` - The program for your transport, defaults to `default`
- `facility` - The syslog facility for this transport, defaults to `daemon`
- `logFormat` - A function to format your log message before sending, see below
- `messageFormat` - A function to format entire message before sending, see below
- `colorize` - Enable colors in Papertrail, defaults to `false`
- `inlineMeta` - Inline multi-line messages, defaults to `false`
- `handleExceptions` - Tell this Transport to handle exceptions, defaults to `false`

There are also a number of settings for connection failure and retry behavior

- `attemptsBeforeDecay` - How many retries should be attempted before backing off, defaults to `5`
- `maximumAttempts` - How many retries before disabling buffering, defaults to `25`
- `connectionDelay` - How long between backoff in milliseconds, defaults to `1000`
- `maxDelayBetweenReconnection` - The maximum backoff in milliseconds, defaults to `60000`
- `maxBufferSize` - The maximum size of the retry buffer, in bytes, defaults to `1048576`

## Advanced Usage

For more some advanced logging, you can take advantage of custom formatting for
Papertrail:

### logFormat

``` js
  var winston = require('winston');

  //
  // Requiring `winston-papertrail` will expose
  // `winston.transports.Papertrail`
  //
  require('winston-papertrail').Papertrail;

  var logger = new winston.Logger({
  	transports: [
  		new winston.transports.Papertrail({
  			host: 'logs.papertrailapp.com',
  			port: 12345,
  			logFormat: function(level, message) {
  			    return '<<<' + level + '>>> ' + message;
  			}
  		})
  	]
  });

  logger.info('this is my message');
```

Note that internally, `winston-papertrial` splits a multiple line message into multiple log entries (one per line). `logFormat` will be applied after the split. If you want to not split the message by line or have access to the meta data, see `messageFormat` below.

### messageFormat

``` js
  var winston = require('winston');

  //
  // Requiring `winston-papertrail` will expose
  // `winston.transports.Papertrail`
  //
  require('winston-papertrail').Papertrail;

  var logger = new winston.Logger({
  	transports: [
  		new winston.transports.Papertrail({
  			host: 'logs.papertrailapp.com',
  			port: 12345,
  			messageFormat: function(level, message, meta) {
          return 'message: ' + message + ', meta: ' + meta;
  			}
  		})
  	]
  });

  logger.info('this is my message');
```

## Transport Events

The Papertrail transport is also capable of emitting events for `error` and `connect` so you can log to other transports:

``` js
var winston = require('winston'),
	Papertrail = require('winston-papertrail').Papertrail;

var logger,
	consoleLogger = new winston.transports.Console({
		level: 'debug',
		timestamp: function() {
			return new Date().toString();
		},
		colorize: true
	}),
	ptTransport = new Papertrail({
		host: 'logs.papertrailapp.com',
		port: 12345,
		hostname: 'web-01',
		level: 'debug',
		logFormat: function(level, message) {
			return '[' + level + '] ' + message;
		}
	});

ptTransport.on('error', function(err) {
	logger && logger.error(err);
});

ptTransport.on('connect', function(message) {
	logger && logger.info(message);
});

var logger = new winston.Logger({
	levels: {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3
	},
	transports: [
		ptTransport,
		consoleLogger
	]
});

logger.info('this is my message ' + new Date().getTime());
```

### Colorization

The `winston-papertrail` transport supports colorization with `winston`. Currently, the ANSI codes used for escape sequences are part of the search index, so please be advised when using colorization.

```Javascript
var winston = require('winston'),
    Papertrail = require('winston-papertrail').Papertrail;

var logger = new winston.Logger({
    transports: [
        new Papertrail({
            host: 'logs.papertrailapp.com',
            port: 12345, // your port here
            colorize: true
        })
    ]
});

logger.info('Hello from colorized winston', logger);
```

### Closing the transport

As of `v0.1.3` `winston-papertrail` transport supports closing the transport (and the underlying TLS connection) via the `Winston.Transport` `close` method. Thus, you can enable scenarios where your transport automatically closes when you close the `winston` logger.

```Javascript
var winston = require('winston'),
    Papertrail = require('winston-papertrail').Papertrail;

pt = new Papertrail({
    host: 'logs.papertrailapp.com',
    port: 12345 // your port here
});

var logger = new winston.Logger({
    transports: [ pt ]
});

pt.on('connect', function () {
    logger.info('logging before I close');
    logger.close(); // this closes the underlying connection in the Papertrail transport
});
```

#### Author: [Ken Perkins](http://blog.clipboard.com)

[0]: https://github.com/flatiron/winston
