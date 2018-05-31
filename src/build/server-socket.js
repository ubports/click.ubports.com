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

var http = require('http');
var sockjs = require('sockjs');

function null_build() {
  return {
    done: () => {},
    logAppend: () => {},
    logBufferDump: () => {}
  }
}

class Node {
  constructor(conn, server) {
    var _this = this;
    this.conn = conn;
    this.building = false;
    this.cb = null_build();
    conn.on('data', function(_message) {
      var message = JSON.parse(_message);
      console.log(message);
        if (!message.type) return;
        switch (message.type) {
          case "auth":
            if (message.data.key === "key") {
              _this._name = message.data.name;
              console.log("build node accepted! ("+_this.name+")");
              server.newNode(_this);
              _this.send("auth", "ok");
            } else {
              // Who is knoking on my door... well anyway fuck off ok?
              console.log("build node tried with wrong key!");
              _this.send("auth", "fail");
              _this.conn.close();
            }
            break;
          case "build-log-append":
            _this.cb.logAppend(message.data);
            break;
          case "build-log-buffer-dump":
            _this.cb.logBufferDump(message.data);
            break;
          case "build-done":
            console.log("building done on "+_this.building);
            _this.building = false;
            server.nodeReady(_this.name);
            _this.cb.done(message.data);
            this.cb = null_build();
            break;
          case "status":
            console.log("status");
            break;
        }
    });
    conn.on('close', function() {server.removeNode(_this.name)});
  }

  send(type, data) {
    this.conn.write(JSON.stringify({
      type: type,
      data: data
    }));
  }

  build(project, git, cb) {
    if (this.ready)
    {
      console.log("building", project, "on node", this.name);
      this.building = project;
      this.cb = cb;
      // Fingers crossed... *snap*... crossed them too hard... it hurts
      this.send("build", git);
    } else {
      // Hey m8, im busy!
      console.error("WTF? you are trying to build when im not ready, calm down dude!");
    }
  }

  get ready() {
    return this.building === false;
  }

  get name() {
    return this._name;
  }
}

class SocketBuildServer {
  constructor(main) {
    var _this = this;
    this.queue = [];
    this._nodes = {};
    this._main = main;
    this._server = sockjs.createServer({ sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js' });
    this._conns = [];
    this._server.on('connection', function(conn) {
        _this._conns.push(new Node(conn, _this));
    });

    var server = http.createServer();
    this._server.installHandlers(server, {prefix:'/api/v1/build/node'});
    server.listen(9999, '0.0.0.0');
  }

  queueBuild(project, git, cb) {
    for (var i in this._nodes) {
      var node = this._nodes[i];
      if (node.ready) {
        console.log("found a ready node", node.name, "to build", project);
        node.build(project, git, cb);
        return;
      }
    }

    // Orrr who's using the node now? I blame dalton
    console.log("no ready node to build", project, "adding to queue");
    this.queue.push({project:project, git:git, cb:cb});
  }

  nodeReady(node) {
    // Heck yeah! we can build!! better hope no segfaults!! oh right it's JavaScript nevermind
    console.log("Node ready "+node);

    if (this.queue.length != 0) {
      var next = this.queue.shift();
      console.log("things in the queue, building next", next.project);
      this._nodes[node].build(next.project, next.git, next.cb);
    } else {
      console.log("none in queue");
    }
  }

  newNode(node) {
    // Xmas came early this year...
    this._nodes[node.name] = node;
    this.nodeReady(node.name);
  }

  removeNode(name) {
    // Xmas camke late this year...
    delete this._nodes[name];
    console.log("Node removed", name);
  }

  get nodes() {
    Object.keys(this._nodes);
  }
}

module.exports = SocketBuildServer;
