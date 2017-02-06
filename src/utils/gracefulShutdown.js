'use strict';
// adapted from https://github.com/sebhildebrandt/http-graceful-shutdown/edit/master/lib/index.js
// but instead of managing the process this will only manage the HTTP Server
// i.e. instead of quitting it will resolve a promise that the server is closed

var isShuttingDown = false;
var connections = {};
var connectionCounter = 0;

const timeout = 3000;

function GracefulShutdown(server) {
  function destroy(socket) {
    if (socket._isIdle && isShuttingDown) {
      socket.destroy();
      delete connections[socket._connectionId];
    }
  }

  server.on('request', function (req, res) {
    req.socket._isIdle = false;

    res.on('finish', function () {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });

  server.on('connection', function (socket) {
    var id = connectionCounter++;
    socket._isIdle = true;
    socket._connectionId = id;
    connections[id] = socket;

    socket.on('close', function () {
      delete connections[id];
    });
  });

  function shutdown() {
    return new Promise(resolve => {
      if (!isShuttingDown) {
        isShuttingDown = true;

        // normal shutdown
        server.close(resolve);

        Object.keys(connections).forEach(function (key) {
          destroy(connections[key]);
        });

        // forcefull shutdown after timeout
        setTimeout(resolve, timeout).unref();
      }
    });
  }

  return {
    shutdown
  };
}

module.exports = GracefulShutdown;
