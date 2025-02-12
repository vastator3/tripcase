#!/usr/bin/env node
// tripcase
// By John Wells (https://github.com/madmod)
//
// Command line interface to the unofficial TripCase API client.
//

'use strict';
const meow = require('meow');
const tripcase = require('./');
const { fetchAllData } = require('./helpers');

const cli = meow({
  help: [
    'Usage',
    '  $ tripcase email password'
  ]
});

const api = new tripcase({
  email: cli.input[0],
  password: cli.input[1]
});

async function main() {
  const allData = await fetchAllData(api);
  console.log(JSON.stringify(allData, null, 2))
}

main();
