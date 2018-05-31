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

const ServerSocket = require('./server-socket.js');
const GithubHook = require('./gh-hook.js');

// For now eveything is memory only, bad yes, indeed really bad
class Build {
  constructor(project) {
    this._project = project;
    this._building = true;
    this._log = "";
  }

  done(log) {
    console.log("DONE", log);
    this._building = false;
    this._log = log;
  }

  logAppend(log) {
    this._log = this.log + log;
  }

  // Used to correct log if the append is "out of sync"
  logBufferDump(log) {
    // for now nothing
  }

  get log() {
    return this._log;
  }

  get building() {
    return this._building;
  }

  get project() {
    return this._project;
  }
}

class BuildServer {
  constructor() {
    this._serverSocket = new ServerSocket(this);
    this._ghHook = new GithubHook(this);
    this._builds = {};
    this._projects = [];
  }

  // Magic, dont question it
  queueBuild(repo, git) {
    if (!this._projects.includes(repo)) this._projects.push(repo);
    if (!this._builds[repo]) this._builds[repo] = [];
    var build = new Build(repo);
    this._builds[repo].push(build);

    this._serverSocket.queueBuild(repo, git, build);
  }

  get nodes() {
    return this._serverSocket.nodes;
  }
  get projects() {
    return this._projects;
  }

  getBuilds(project) {
    if (this._builds.hasOwnProperty(project))
      return this._builds[project];
    else
      return false;
  }
}

module.exports = BuildServer;
