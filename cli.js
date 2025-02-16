#!/usr/bin/env node
// tripcase
// By John Wells (https://github.com/madmod)
//
// Command line interface to the unofficial TripCase API client.
//

'use strict';
// const meow = require('meow');
// const cli = meow(`
//     Usage
//       $ foo <input>
// `);

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs').promises;
const path = require('path');

const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <email> <password>')
    .demandCommand(2, 'Please provide both email and password')
    .argv;

// Use argv instead of cli.input
// console.log(cli.input);
console.log(argv._);

const tripcase = require('./');
const { fetchAllData } = require('./helpers');

const api = new tripcase({
  email: argv._[0],    // First argument is email
  password: argv._[1]  // Second argument is password
});

async function main() {
  try {
    console.log('Fetching TripCase data...');
    const allData = await fetchAllData(api);
    
    // Create output directory if it doesn't exist
    const outputDir = 'output';
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `tripcase-data-${timestamp}.json`);
    
    // Write data to file
    await fs.writeFile(outputFile, JSON.stringify(allData, null, 2));
    console.log(`\nData successfully saved to: ${outputFile}`);
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Total trips: ${allData.trips.length}`);
    console.log(`User: ${allData.user.name} (${allData.user.email})`);
  } catch (error) {
    console.error('Failed to fetch or save data:', error.message);
    process.exit(1);
  }
}

main();
