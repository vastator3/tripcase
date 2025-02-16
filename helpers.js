// tripcase
// By John Wells (https://github.com/madmod)
//
// Command line interface to the unofficial TripCase API client.
//
'use strict';
const util = require('util');
const _ = require('lodash');
const debug = require('debug')('tripcase-cli');
const fs = require('fs').promises;
const path = require('path');

// Helper function to log errors
async function logError(err) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const errorFile = path.join('logs', `error-${timestamp}.txt`);
  
  // Create logs directory if it doesn't exist
  await fs.mkdir('logs', { recursive: true });
  
  const errorLog = `Time: ${new Date().toISOString()}\n` +
    `Error: ${err.message}\n` +
    `Stack: ${err.stack}\n` +
    `Response Data: ${JSON.stringify(err.response?.data, null, 2)}\n` +
    `Full Error: ${JSON.stringify(err, null, 2)}`;

  await fs.writeFile(errorFile, errorLog);
  console.error(`Error logged to: ${errorFile}`);
}

// Convert callback-based methods to promise-based methods

async function fetchAllData(api) {
  try {
    // First ensure we're logged in
    console.log('Logging in...');
    const loginResponse = await api.login();
    const user = loginResponse.data;
    console.log(`Logged in successfully as ${user.user.name}`);

    console.log('\nFetching trips...');
    // Fetch trips sequentially to maintain session state
    console.log('- Fetching active trips...');
    const activeTrips = await api.getTrips(true, false);
    console.log('- Fetching active following trips...');
    const activeFollowingTrips = await api.getTrips(true, true);
    console.log('- Fetching inactive trips...');
    const inactiveTrips = await api.getTrips(false, false);
    console.log('- Fetching inactive following trips...');
    const inactiveFollowingTrips = await api.getTrips(false, true);

    const trips = _.uniqBy([
      ...(activeTrips.data || []),
      ...(activeFollowingTrips.data || []),
      ...(inactiveTrips.data || []),
      ...(inactiveFollowingTrips.data || [])
    ], 'id');

    console.log(`\nFound ${trips.length} unique trips. Fetching details for each trip...`);

    const processedTrips = [];
    const failedTrips = [];

    for (let trip of trips) {
      try {
        console.log(`\nFetching details for trip: ${trip.name}`);
        console.log(`  ID: ${trip.id}`);
        console.log(`  Date: ${trip.start_date} to ${trip.end_date}`);
        
        const tripDetailsRes = await api.getTripDetails(trip.id);
        trip.details = tripDetailsRes.data;
        
        // Log some basic info about the trip's contents
        const events = tripDetailsRes.data.events || [];
        console.log(`  Events: ${events.length} total`);
        const eventTypes = _.countBy(events, 'type');
        Object.entries(eventTypes).forEach(([type, count]) => {
          console.log(`    - ${type}: ${count}`);
        });

        processedTrips.push(trip);
      } catch (tripError) {
        console.log(`  ⚠️ Failed to fetch details for trip ${trip.name} (ID: ${trip.id})`);
        if (tripError.response?.status === 409) {
          console.log(`  ℹ️ Trip appears to be broken or invalid`);
        } else {
          console.log(`  ❌ Error: ${tripError.message}`);
        }
        failedTrips.push({
          tripInfo: trip,
          error: {
            message: tripError.message,
            status: tripError.response?.status,
            data: tripError.response?.data
          }
        });
        await logError(tripError);
      }
    }

    console.log('\nFetch summary:');
    console.log(`✅ Successfully processed: ${processedTrips.length} trips`);
    if (failedTrips.length > 0) {
      console.log(`❌ Failed to process: ${failedTrips.length} trips`);
    }

    return { 
      user: user.user, 
      trips: processedTrips,
      failedTrips: failedTrips.length > 0 ? failedTrips : undefined
    };

  } catch (err) {
    await logError(err);
    throw err;
  }
}
exports.fetchAllData = fetchAllData;

function trimNewlines(str) {
    return str.replace(/^\s+|\s+$/g, '');
}
exports.trimNewlines = trimNewlines;
