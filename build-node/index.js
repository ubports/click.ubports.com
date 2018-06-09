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

const BUILD_DIR = __dirname+"build";
const BUILD_OUTPUT = `${BUILD_DIR}/build`
const BUILD_INSTAL = `${BUILD_OUTPUT}/tmp`
const BUILD_MANIFEST = `${BUILD_INSTAL}/manifest.json`
const BUILD_CLICKABLE = `${BUILD_DIR}/clickable.json`

const SockJS = require('sockjs-client')
const cp = require('child_process');
const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const request = require("request");
const simpleGit = require('simple-git/promise');
const rimraf = require("rimraf");

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
function send(type, data) {
  clientSocket.send(JSON.stringify({
    type: type,
    data: data
  }));
}

function readJson(file) {
  if (!fs.existsSync(file))
    return false
  else {
    return require(file);
  }
}

function findClick() {
 var files=fs.readdirSync(BUILD_OUTPUT);
 for(var i=0;i<files.length;i++){
     var filename = path.join(BUILD_OUTPUT,files[i]);
     var stat = fs.lstatSync(filename);

     if (stat.isDirectory())
      continue;

     if (filename.endsWith(".click"))
         return filename;
 }
}

function spawn(script, args, callback) {
  var buildlog = "";
  var i = 0;
  const buildchild = cp.spawn(script, args, {
    cwd: BUILD_DIR
  });
  buildchild.stdout.on('close', (code) => {
    if (code)
      return buildFailed(code);

    send("build-log-buffer-dump", buildlog);
    callback();
  });
  buildchild.stdout.on('data', (_data) => {
    var data = _data.toString();
    buildlog = buildlog + data;
    send("build-log-append", data);

    i++;
    // Why 50? because I said so!
    if (i >= 50) {
      send("build-log-buffer-dump", buildlog);
      i = 0;
    }
  });
}

function buildFailed(err) {
  console.log("failed", err);
  send("build-failed", err);
  building = false;
}

function buildDone() {
  console.log("done");
  building = false;
  send("build-done");
}

function buildUploadUrl(uid) {
  var click = findClick();
  if (!click)
    return buildFailed("Cannot find click");

  var url;
  if (port == "80")
    url = `https://${host}/api/v1/build/upload/${uid}`
  else
    url = `https://${host}:${port}/api/v1/build/upload/${uid}`
  console.log(url);

  var req = request.post(url, function (err, res, body) {
    if (err)
      return buildFailed("Cannot upload click");
    else
      return buildDone();
  });
  var form = req.form();
  form.append('file', fs.createReadStream(click));
}

function buildSuccess() {
  if (!findClick())
    return buildFailed("Cannot find click");

  send("build-success");
}

function buildClick() {
  var manifest = readJson(BUILD_MANIFEST);
  if (!manifest)
    return buildFailed("Missing manifest.json");

  if (manifest.name && typeof manifest.name === "string")
    send("build-appid", manifest.name);
  spawn("clickable", ["-k", "16.04", "build-click"], buildSuccess);
}

function clone(git) {
  send("build-log-append", `Git clone ${git}`);
  simpleGit().clone(git, BUILD_DIR).then(() => {
    var clickable = readJson(BUILD_CLICKABLE);
    if (!clickable)
      return buildFailed("Missing clickable.json");

    if (clickable.appID && typeof clickable.appID === "string")
      send("build-appid", clickable.appID);

    console.log("CLICKABLE");
    spawn("clickable", ["-k", "16.04", "build"], buildClick);
  }).catch((e) => {
    console.log(e);
    buildFailed("Failed to clone git repo");
  });
}

function build(git) {
  building = true;

  if (fs.existsSync(BUILD_DIR))
    rimraf(BUILD_DIR, (e) => {
      console.log(e);
      clone(git);
    });
  else
    clone(git);
}

if (!config)
  omg("We are missing a config file!");
if (!config.host)
  omg("Config is missing host");
else
  host = config.host
if (!config.port)
  port = 3000;
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

var clientSocket;
if (port == "80")
  clientSocket = new SockJS("https://" + host + "/api/v1/build/node")
else
  clientSocket = new SockJS("https://" + host + ":" + port + "/api/v1/build/node")

clientSocket.addEventListener("open", (message) => {
  console.log("Master, we are connected to master!")
  send("auth", {
    key: config.key,
    name: config.name
  });
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
        omg("Key is not valid!!! WHY DID YOU DO THIS TO ME");
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
      send("status", {
        building: building
      });
      break;
    case "build-upload-url":
      buildUploadUrl(message.data);
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
