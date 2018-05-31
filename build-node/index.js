/*
 * Copyright (C) 2018 Marius Gripsgard <marius@ubports.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const SockJS = require('sockjs-client')
const spawn = require('child_process').spawn;
const config = require('./config.json');

var host;
var port;
var key;

var building = false;

// Yeah...
function omg(e) {
  console.erro(e);
  process.exit();
}

// Don't ask
function send(m) {
  clientSocket.send(JSON.stringify(m));
}

function build(git) {
  const buildchild = spawn("./build.sh", [git]);
  building=true;
  var buildlog = "";
  var i=0;
  buildchild.stdout.on('close', (code) => {
    console.log("exit");
    building=false;
    if (code) {
      send({
        type: "build-failed",
        data: code
      })
    } else {
      send({
        type: "build-done",
        data: buildlog
      })
    }
  });
  buildchild.stdout.on('data', (_data) => {
    var data = _data.toString();
    buildlog = buildlog + data;
    send({
      type: "build-log-append",
      data: data
    });

    i++;
    // Why 50? because I said so!
    if (i >= 50) {
      send({
        type: "build-log-buffer-dump",
        data: buildlog
      });
      i=0;
    }
  });
}

if (!config)
  omg("We are missing a config file!");
if (!config.host)
  omg("Config is missing host");
else
  host = config.host
if (!config.port)
  port = 9999;
else
  port = config.port;
if (!config.key)
  omg("Config is missing key");
else
  key = config.key;
if (!config.name)
  omg("Config is missing name");
else
  key = config.name;

const clientSocket = new SockJS("http://" + host + ":" + port + "/api/v1/build/node")

clientSocket.addEventListener("open", (message) => {
  console.log("Master, we are connected to master!")
  send({
    type: "auth",
    data: {
      key: config.key,
      name: config.name
    }
  })
});

clientSocket.addEventListener("message", (_message) => {
    var message = JSON.parse(_message.data);
  if (!message.type) return;

  switch (message.type) {
    case "auth":
      // Because security
      if (message.data === "ok")
        console.log("Auth ok");
      else
        console.log("Key is not valid!!! WHY DID YOU DO THIS TO ME");
      break;
    case "build":
      // If you dont fuck it up, and do it right, It just works!
      build(message.data);
      break;
    case "halt":
      // KILL KILL KILL!
      buildchild.kill();
      break;
    case "status":
      send({
        type: "status",
        data: building
      })
      break;
    // Fuck default, we dont care about other events
  }
})

clientSocket.addEventListener("close", (message) => {
 if (!message.wasClean)
   console.log(message.reason);
 // Huston, we got porblems!
 process.exit();
});
