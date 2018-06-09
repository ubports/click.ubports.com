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
const openstore = require('../interactors/openstore.js');
const config = require("../config.js");
const uuidv4 = require('uuid/v4');

// For now eveything is memory only, bad yes, indeed really bad
class Build {
  constructor(project) {
    this._project = project;
    this._building = true;
    this._log = "";
    this.queued();
  }

  done() {
    this._building = false;
    this.buildSuccess();
  }

  gotFile(file) {
    console.log(file);
    this._file = file;
    this.uploadOpenstore();
  }

  setAppId(app) {
    this.project.setAppId(app);
  }

  uploadOpenstore() {
    console.log("apid", this.project.openstoreAppid)
    if (!this.canUploadOpenstore)
      return false;

    console.log("O");
    console.log(this.project.openstoreAppid,
                          `${config.url}/clicks/${this.file}`,
                          this.project.openstoreApiKey)
    openstore.newRevision(this.project.openstoreAppid,
                          `${config.url}/clicks/${this.file}`,
                          this.project.openstoreApiKey).then((e) => {
                            console.log("up", e);
                            this.o_uploaded = true;
                          }).catch((e) => {console.log("!up", e)});
  }

  get canUploadOpenstore() {
    return this.project.openstoreAppid ? true : false;
  }

  get uploadedToOpenstore() {
    return this.o_uploaded;
  }

  get file() {
    return this._file;
  }

  logAppend(log) {
    this._log = this.log + log;
  }

  // Used to correct log if the append is "out of sync"
  logBufferDump(log) {
    // for now nothing
  }

  queued() {
    this._queue = true;
    this._building = false;
    this._failed = false;
  }

  buildStarted() {
    this._building = true;
    this._queue = false;
    this._failed = false;
  }

  buildFailed() {
    this._building = false;
    this._queue = false;
    this._failed = true;
  }

  buildSuccess() {
    this._building = false;
    this._queue = false;
    this._failed = false;
  }

  get log() {
    return this._log;
  }

  get building() {
    return this._building;
  }

  get failed() {
    return this._failed;
  }

  get queue() {
    return this._queue;
  }

  get project() {
    return this._project;
  }
}

class Project {
  constructor(repo) {
    this._repo = repo;
    this._builds = [];

    // Right now this is hard coded!
    this.o_key = config.apiKey
  }

  newBuild(build) {
    this._builds.push(build);
  }

  setAppId(appId) {
    var _this = this;
    this._appId = appId;
    openstore.app(appId).then((app) =>{
      console.log(app.data.data);
      _this._appId = app.data.data.id;
      _this.o_data = app.data.data;
    });
  }

  get appId() {
    return this._appId ? this._appId : false;
  }
  get openstoreAppid() {
    return this.o_data ? this.o_data.id : false;
  }
  get openstoreAppName() {
    return this.o_data ? this.o_data.name : false;
  }
  get openstoreApiKey() {
    return this.o_key ? this.o_key : false;
  }
  get name() {
    return this._appId ? this.o-data.name : false;
  }
  get builds() {
    return this._builds;
  }
}

class BuildServer {
  constructor(server) {
    this._serverSocket = new ServerSocket(this, server);
    this._ghHook = new GithubHook(this);
    this._projects = {};
    this._uploadId = {};
  }

  // Magic, dont question it
  queueBuild(repo, git) {
    if (!this._projects[repo])
      this._projects[repo] = new Project(repo);
    var project = this._projects[repo];

    var build = new Build(project);
    project.newBuild(build);

    this._serverSocket.queueBuild(repo, git, build);
  }

  createUploadId(forWho) {
    console.log("q", forWho.building);
    var id = uuidv4();
    this._uploadId[id] = forWho;
    return id;
  }

  isUploadIdValid(id) {
    return this._uploadId[id] ? true : false;
  }

  fileUploaded(id, file) {
    console.log(id, file.filename);
    if (!this.isUploadIdValid(id))
      return false;
    console.log("OK!!!");
    this._uploadId[id].gotFile(file.filename);
    this._uploadId[id] = () => {};
    delete this._uploadId[id];
  }

  get nodes() {
    return this._serverSocket.nodes;
  }
  get projects() {
    return Object.keys(this._projects);
  }

  getBuilds(project) {
    if (!this._projects[project])
      return false;

    return this._projects[project].builds;
  }

  getBuild(project, buildid) {
    var pro = this.getBuilds(project)
    if (!pro) return false;
    if (pro[buildid])
      return pro[buildid]
    else
      return false;
  }
}

module.exports = BuildServer;
