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

var githubhook = require('githubhook');
const config = require("../../config.json");

//TODO remove to edit this before putting to real use!!!
//ok for now since we only accept things from ubports repo
var github = githubhook({port: 9990, secret: config.secret});

class GithubHook {
  constructor(server) {
    github.on('push', function (repo, ref, data) {
      if (data.repository.owner.name !== "ubports") {
        // Who is knoking on my door... well anyway fuck off ok?
        console.error("Unknown user!!!! die now!");
        return;
      }
      console.log("GITHOKK", data.repository.full_name, data.repository.clone_url);
      server.queueBuild(data.repository.full_name, data.repository.clone_url);
    });

    // Listen, listen, just do it!
    github.listen();
  }
}

module.exports = GithubHook;
