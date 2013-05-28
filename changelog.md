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
