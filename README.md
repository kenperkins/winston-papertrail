# winston-papertrail

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
* __port:__ The TLS Endpoint TCP Port

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

For more some advanced logging, you can take advantage of custom formatting for
Papertrail:

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
    logger.close(); // this closes the underlying TLS connection in the Papertrailt transport
});
```

Currently, the Papertrail transport only supports TLS logging.


#### Author: [Ken Perkins](http://blog.clipboard.com)

[0]: https://github.com/flatiron/winston
