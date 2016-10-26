process.env.NODE_ENV = 'test';
const mocha = require('mocha');
const coMocha = require('co-mocha');
coMocha(mocha); // patch mocha
