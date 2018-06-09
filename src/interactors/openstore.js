// Copyright (c) 2018 Marius Gripsgard <marius@ubports.com>
//
// GNU GENERAL PUBLIC LICENSE
//    Version 3, 29 June 2007
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const axios = require("axios");

module.exports = {
  app: (appId) => {
    return axios.get(`https://open-store.io/api/v3/apps/${appId}`);
  },
  newRevision: (appId, fileUrl, apiKey) => {
    console.log("newRevision");
    return axios.post(`https://open-store.io/api/v3/manage/${appId}/revision?apikey=${apiKey}`, {
        "downloadUrl": fileUrl,
        "channel": "xenial"
    });
  }
};
