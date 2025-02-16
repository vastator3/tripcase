// tripcase
// By John Wells (https://github.com/madmod)
//
// Unofficial TripCase API client.
//

'use strict';

const debug = require('debug')('tripcase');
const uuid = require('node-uuid');
const axios = require('axios');
const { CookieJar } = require('tough-cookie');

const hardwareId = uuid.v4().toUpperCase();
debug('hardwareId', hardwareId);

// Create axios instance with default config
const api = axios.create({
  baseURL: 'https://www.tripcase.com/mapi',
  headers: {
    'App-Agent': 'TripCase/5 {"touch":true,"device":"iOS","app_version":"4.0.0","osv":"8.3","locale":"en-us","screen_size":"414x716","device_type":"1","device_hwid":"'+ hardwareId +'","native":"PhoneGap"}',
    'Accept': 'application/json',
    'Accept-Language': 'en-us',
    'Content-Type': 'application/json',
    'Origin': 'file://',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12F70 (5046860304)'
  },
  withCredentials: true
});

// Store cookies between requests
let cookies = [];

// Add request interceptor to include cookies
api.interceptors.request.use(config => {
  if (cookies.length > 0) {
    config.headers.Cookie = cookies.join('; ');
  }
  return config;
});

// Add response interceptor to capture cookies and handle session expiration
api.interceptors.response.use(
  response => {
    // Capture cookies from response
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      cookies = setCookie.map(cookie => cookie.split(';')[0]);
    }
    return response;
  },
  async error => {
    if (error.response?.status === 403 && error.response?.data?.[0] === 'Your session has expired, please log back in.') {
      // Clear cookies on session expiration
      cookies = [];
      
      // Get the original request configuration
      const originalRequest = error.config;
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        // Try to login again
        const instance = originalRequest.__tripcase_instance;
        if (instance) {
          try {
            await instance.login();
            // Retry the original request
            return api(originalRequest);
          } catch (loginError) {
            return Promise.reject(loginError);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// TripCase API client constructor
// Requires an email and password in options
function TripCase(options) {
  if (!options || !options.email || !options.password) throw 'Missing required options';

  this.email = options.email;
  this.password = options.password;
  this.session = null;

  return this;
}

// Login to TripCase and save the session
TripCase.prototype.login = async function login(callback) {
  try {
    const response = await api.post('/sessions.json?v=20150105', {
      email: this.email,
      password: this.password
    });
    
    this.session = response.data;
    if (callback) callback(null, { body: response.data });
    return response;
  } catch (error) {
    if (callback) callback(error);
    throw error;
  }
};

// Get upcoming TripCase trips
TripCase.prototype.getTrips = async function getTrips(active, following, callback) {
  try {
    // Ensure we're logged in
    if (!this.session) {
      await this.login();
    }

    const url = following 
      ? `/trips/following.json?active=${active || false}`
      : `/trips.json?active=${active || false}`;

    const config = {
      __tripcase_instance: this // Attach the instance to the request config
    };

    const response = await api.get(url, config);
    if (callback) callback(null, { body: response.data });
    return response;
  } catch (error) {
    if (callback) callback(error);
    throw error;
  }
};

// Get a TripCase trip's details by id
TripCase.prototype.getTripDetails = async function getTripDetails(id, callback) {
  try {
    // Ensure we're logged in
    if (!this.session) {
      await this.login();
    }

    const config = {
      __tripcase_instance: this // Attach the instance to the request config
    };

    const response = await api.get(`/trips/${id}.json?suppress_messages=true&destination=true`, config);
    if (callback) callback(null, { body: response.data });
    return response;
  } catch (error) {
    if (callback) callback(error);
    throw error;
  }
};

module.exports = TripCase;

