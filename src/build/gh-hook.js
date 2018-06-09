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

var GithubWebHook = require('express-github-webhook');
const config = require("../config.js");

class GithubHook {
  constructor(server, app) {
    var webhookHandler = GithubWebHook({ path: '/api/callback', secret: config.secret });

    app.use(webhookHandler);

    webhookHandler.on('push', function (event, data) {
      if (data.repository.owner.name !== "ubports") {
        // Who is knoking on my door... well anyway fuck off ok?
        console.error("Unknown user!!!! die now!");
        return;
      }
      console.log("GITHOKK", event, data);
      server.queueBuild(event, data.repository.clone_url);
    });
  }
}

module.exports = GithubHook;
