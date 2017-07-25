/*
  runner: node morph.js eva
*/

const util = require('util')
var test = process.argv.slice(2)[0] || false;
var next = process.argv.slice(3)[0] || false;
// var util = require('util');

var path = require('path');
var fs = require('fs');


var segmenter = require('./index');

if (!test) log('?');

// var samasa;
// if (/[a-zA-Z]/.test(lat[0])) {
//     samasa = salita.slp2sa(lat);
// } else {
//     samasa = lat;
//     lat = salita.sa2slp(samasa);
// }

// log('_la_:', lat, '_sa_:', samasa);

console.time('_segmenter');

segmenter(test, function(err, res) {
    log('SEG res: ==============>>');
    log(res);
    console.timeEnd('_segmenter');
});

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}
