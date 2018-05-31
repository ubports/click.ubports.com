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

class Router {
  constructor(build) {
    this._router = express.Router();
    this._router.get('/', function(req, res, next) {
      res.render('index', { projects: build.projects, project: "UBports Click build log" });
    });

    this._router.get('/:project', function(req, res, next) {
      var bu = build.getBuilds(req.params.project);
      if (!bu) {
        res.sendStatus(404).send("Not found");
        return;
      }

      res.render('project', { project: req.params.project, logs: bu });
    });
  }

  get router() {
    return this._router;
  }
}

module.exports = Router;
