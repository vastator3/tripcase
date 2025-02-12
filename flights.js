#!/usr/bin/env node
// tripcase
// By John Wells (https://github.com/madmod)
//
// Command line interface to the unofficial TripCase API client.
//

'use strict';
const ics = require('ics');
const meow = require('meow');
const fs = require('fs');
const util = require('util');
const tripcase = require('.');
const { fetchAllData } = require('./helpers');
const debug = require('debug')('tripcase-cli');
const _ = require('lodash');
const dayjs = require('dayjs');

const writeFileAsync = util.promisify(fs.writeFile);
const createEventsAsync = util.promisify(ics.createEvents);

const cli = meow({
  help: [
    'Usage',
    '  $ npm run flights email password'
  ]
});

const api = new tripcase({
  email: cli.input[0],
  password: cli.input[1]
});

function parseDateTime(dateTimeString) {
  const date = dayjs(dateTimeString);
  return [
    date.year(),
    date.month() + 1, // month() returns 0-11
    date.date(),
    date.hour(),
    date.minute()
  ];
}

async function main() {
  // const allData = require('./all-trips.json');
  const allData = await fetchAllData(api);
  await writeFileAsync('./all-trips.json', JSON.stringify(allData, null, 2));
  debug('identifying flights...')
  const tripsWithFlights = allData.trips.filter((trip) =>{
    debug('checking for fligts in', trip.name)
    if (trip.details.errors) {
      debug('errors in details for', trip.name)
      return false;
    }
    return trip.traveler_name === 'Luke Zilioli' && trip.details.items.some(item => item.type === 'Air')
  });
  const tripsIncludingFlights = _.chain(tripsWithFlights)
  .map(trip => {
    return {
      ...trip,
      flights: trip.details.items.filter(item => item.type === 'Air')
    }
  })
  .flatten()
  .value();

  await writeFileAsync('./trips-with-flights.json', JSON.stringify(tripsWithFlights, null, 2));

  const allFlightDetails = _.chain(tripsIncludingFlights)
  .map((trip) => {
    return _.chain(trip.flights)
      .map((flightEntry) => {
        const flight = flightEntry.air_reservation.flight;
        return {
          name: trip.name,
          traveler: trip.traveler_name,
          date: flight.scheduled_departure,
          startTime: flightEntry.start_time.time,
          endTime: flightEntry.end_time.time,
          airline: flight.airline.name,
          code: flight.airline.iata_code,
          number: flight.flight_number,
          fromAirport: flight.departure_airport.iata_code,
          fromCity: flight.departure_airport.general_location,
          toAirport: flight.arrival_airport.iata_code,
          toCity: flight.arrival_airport.general_location,
        }
      })
      .value();
  })
  .flatten()
  .value();

  await writeFileAsync('./export/flight-info.json', JSON.stringify(allFlightDetails, null, 2))

  const events = allFlightDetails.map(flight => {
    const { startTime, endTime, name, airline, code, number, fromCity, toCity, fromAirport, toAirport } = flight;
    const description = `${airline} flight ${code}${number} from ${fromCity} (${fromAirport}) to ${toCity} (${toAirport})`;
    const [startYear, startMonth, startDay, startHour, startMinute] = parseDateTime(startTime);
    const [endYear, endMonth, endDay, endHour, endMinute] = parseDateTime(endTime);

    return {
      start: [startYear, startMonth, startDay, startHour, startMinute],
      end: [endYear, endMonth, endDay, endHour, endMinute],
      title: name,
      description: description,
      status: 'CONFIRMED',
      busyStatus: 'BUSY'
    };
  });

  console.log(`Found ${events.length} flights`)


  const calendar = await createEventsAsync(events);
  await writeFileAsync(('./export/flights.ics'), calendar);
  console.log('flights.ics file has been created successfully');

}

main();
