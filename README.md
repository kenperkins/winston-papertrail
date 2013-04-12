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
	ptTransport = new Papertrail({
		host: 'logs.papertrailapp.com',
		port: 12345,
		hostname: 'web-01',
		logFormat: function(level, message) {
			return '<<<' + level + '>>> ' + message;
		}
	});

ptTransport.on('error', function(err) {
	logger && logger.error(err);
});

ptTransport.on('connect', function(message) {
	logger && logger.info(message);
});

var logger = new winston.Logger({
	transports: [
		ptTransport,
		new winston.transports.Console({
			level: 'debug',
			colorize: true
		})
	]
});

logger.info('this is my message');

```

Currently, the Papertrail transport only supports TLS logging.


#### Author: [Ken Perkins](http://blog.clipboard.com)

[0]: https://github.com/flatiron/winston
