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

var express = require('express');
var multer  = require('multer');

class Router {
  constructor(build) {
    var storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, __dirname+'.../../../public/clicks');
      },
      filename: function (req, file, cb) {
        var name = file.originalname.replace(".click", "");
        console.log(name);
        cb(null, name + '-' + Date.now() + ".click");
      }
    });

    var fileFilter = (req, file, cb) => {
      if (!req.params.id && !build.isUploadIdValid(req.params.id))
        return cb(null, false);

      cb(null, true);
    }

    var upload = multer({storage: storage, fileFilter: fileFilter});

    this._router = express.Router();
    this._router.get('/', function(req, res, next) {
      res.render('index', { projects: build.projects, project: "UBports Click build log" });
    });

    this._router.post('/test', function(req, res, next) {
      var data = req.body;
      console.log(data);
      if (!data.repository)
        return res.send("NO repository")
      if (!data.repository.full_name)
        return res.send("NO full_name")
      if (!data.repository.clone_url)
        return res.send("NO clone_url")

      build.queueBuild(data.repository.full_name, data.repository.clone_url)
      res.send("OK");
    });

    this._router.get('/:project', function(req, res, next) {
      var bu = build.getBuilds(req.params.project);
      if (!bu) {
        res.sendStatus(404).send("Not found");
        return;
      }

      res.render('project', { project: req.params.project, builds: bu });
    });

    this._router.get('/:project/:buildid', function(req, res, next) {
      var bu = build.getBuild(req.params.project, req.params.buildid);
      if (!bu) {
        res.sendStatus(404).send("Not found");
        return;
      }

      res.render('build', { project: req.params.project, log: bu });
    });

    this._router.post('/api/v1/build/upload/:id', upload.single('file'), function (req, res, next) {
      build.fileUploaded(req.params.id, req.file);
      res.send("ok");
    });
  }

  get router() {
    return this._router;
  }
}

module.exports = Router;
