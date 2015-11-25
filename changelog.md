#v1.0.2
- Fixed a bug when logging error objects [dmiddlecamp][7]

# v1.0.1 #
- Cleaned up formatting for inline meta objects #30 [byrcekahle][6]

# v1.0.0 #
- Switched to [RFC 5425](https://tools.ietf.org/html/rfc5424) for messages to Papertrail #29 [jahqueel][5]
- Fixed a bug with meta not showing up correctly #28 [brycekahle][6]

# v0.2.3 #
- Fixed a case where non-object meta would throw #27

# v0.2.1 #
- Fixed a case where calling `close` before `connect` would fail to end the stream #22

# v0.2.0 #
- Added support for non-TLS connections
- Cleaned up Socket Error handling due to keep-alive changes #23 [eric][4]
- Moved tests to Mocha (Finally!)
- Cleaned up README for all options

# v0.1.4 #
- Handling case when meta is an empty object [voodootikigod][3]

# v0.1.3 #
- Adding support for Colorization (Fix for issue #11)
- Enabling winston.close to propogate to Papertrail transport (Fix for issue #14)

# v0.1.2 #
- Updating deps to allow winston >=0.6.x (for issue #9)

# v0.1.1 #
- set rejectUnauthorized = false for TLS (workaround for issue #6)

# v0.1.0 #
- Removed the levelDecorators option in favor of a format function
- Added a `connect` event for Papertrail
- Switched to jsdoc format
- Updated to winston 0.6.x dependency
- Added more examples to README

# v0.0.6 #
- Handle when logging a null or non-string value, Fix for issue #5

# v0.0.4 #
- Emits error when the buffer of messages reaches a maximum limit [Camilo Aguilar][2]
- Add functionality to log uncaught exceptions [Lars Jacob][0]
- Add option to inline meta data [Lars Jacob][0]
- Don't send extra message if our message ends with a newline [Andy Burke][1]

# v0.0.2 #
- Added levelDecorators option to allow decorating the log level

# v0.0.1 #
- first stable version
- implemented all basic functions
- associations are working

[0]: https://github.com/jaclar
[1]: https://github.com/andyburke
[2]: https://github.com/c4milo
[3]: https://github.com/voodootikigod
[4]: https://github.com/eric
[5]: https://github.com/jahqueel
[6]: https://github.com/brycekahle
[7]: https://github.com/dmiddlecamp
