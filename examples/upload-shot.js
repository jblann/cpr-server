/*

Sample node.js application to create new shot
based on https://github.com/request/request

*/
var request = require('request');
var fs = require('fs');

var config = require('./config.js');
var requestp = require('./utils').requestp;

function random(low, high) {
    return Math.random() * (high - low) + low;
}

function randomPlate() {
    return "GOV" + Math.floor(random(0, 9.9)) + Math.floor(random(0, 9.9)) + Math.floor(random(0, 9.9));
}

function generateRandomShot(imageId) {
    return {
        image: imageId,
        plate: randomPlate(),
        gps: {
            lat: random(54.39, 54.44),
            lon: random(25.11, 25.19)
        },
        plates: [
            { plate: randomPlate(), probability: Math.random() }
        ],
        shotAt: new Date()
    };
}

function extractXsrfToken(response, callback) {
    var cookies = response.headers['set-cookie'].join();
    var match = /XSRF-TOKEN=(.*?);/i.exec(cookies);
    if (match) {
        callback(match[1]);
    } else {
        throw new Error('XSRF Token not found');
    }
}

function login(headers) {
    return requestp({
        uri: config.LOGIN,
        method: 'POST',
        body: { username: config.USERNAME, password: config.PASSWORD},
        headers,
        json: true
    }).then(() => {
        console.log('Login successful!');
    });
}

function processFile(filename, headers) {
    console.log('Uploading', filename);
    return requestp({
        uri: config.IMAGES,
        method: 'POST',
        headers,
        formData: {
            image: fs.createReadStream(filename)
        }
    })
    .then(response => JSON.parse(response.body).filename)
    .then(imageId => createShot(imageId, headers));
}

function createShot(imageId, headers) {
    console.log('Creating shot for imageId', imageId);
    return requestp({
        uri: config.SHOTS,
        method: 'POST',
        headers,
        body: generateRandomShot(imageId),
        json: true
    })
    .then(response => console.log('Shot created successfully!', response.body));
}

//
// Main application
//
// Get XSRF TOKEN ---> LOGIN ---> UPLOAD IMAGE ---> CREATE SHOT

const headers = {};

console.log(`Start uploading ${config.FILENAME}...`);

requestp({ uri: config.URL })
    .then(response => new Promise(resolve => extractXsrfToken(response, resolve)))
    .then(xsrftoken => headers['x-xsrf-token'] = xsrftoken)
    .then(() => login(headers))
    .then(() => processFile(config.FILENAME, headers))
    .catch(err => console.error('Upload failed', err));
