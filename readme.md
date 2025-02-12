# tripcase [![Build Status](https://travis-ci.org/madmod/tripcase.svg?branch=master)](https://travis-ci.org/madmod/tripcase)


# @lzilioli Changes 2025:

[TripCase is retiring](https://www.reddit.com/r/travel/comments/1imzlga/tripcase_retiring/). We need a better way to export.

Heavily modified fork of https://github.com/madmod/tripcase

You can export your flights to an .ics file with the following steps. You can then
import this to iCalendar or TripIt.

I tested with nodejs version 20. I recommend you use nvm. [Install instructions](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script).

Once you have nvm:

```
git clone https://github.com/lzilioli/tripcase.git
cd tripcase
nvm install # install node 20 (specified in the .nvmrc)
nvm use # switch to version 20 (specified in the .nvmrc)
npm install # tested with node 20
# creates file at export/flights.ics
npm run flights <username> <password>
# creates file at export/all-trips.json
npm run fetch-all-trips <username> <password>
```

---

An unofficial TripCase API client.

This uses the internal TripCase mobile API which may change without notice.

## Install

```
$ npm install --save tripcase
```


## Usage

```js
var TripCase = require('tripcase');

var tripcase = new TripCase({
  email: 'user@example.com',
  password: 'supersecret'
});

tripcase.login(function (err, res, body) {
  if (err) throw err;

  tripcase.getTrips(function (err, res, trips) {
    if (err) throw err;
    console.log('upcoming trips', trips);
  });
});
```


## CLI

```
$ npm install --global tripcase
```
```
$ tripcase username password
```


## License

MIT © [madmod](http://johnathanwells.com)

