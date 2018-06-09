var config;

try {
  config = require("../config.json");
} catch (e) {
  config = {
    key: process.env.KEY,
    apiKey: process.env.APIKEY,
    url: process.env.URL,
    secret: process.env.SECRET
  };
}

if (!config.key || !config.apiKey || !config.url || !config.secret)
  throw "Cannot find config.json or environment variables"

module.exports = config;
