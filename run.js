/*
  runner: node run.js chinese test; ex: 第三十各地区
*/

const util = require('util')
var test = process.argv.slice(2)[0] || false;
var next = process.argv.slice(3)[0] || false;
// var util = require('util');

var path = require('path');
var fs = require('fs');


var segmenter = require('./index');

if (!test) log('?');

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
