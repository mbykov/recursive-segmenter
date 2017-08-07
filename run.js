/*
  runner: node run.js bchinese test; ex: 第三十各地区
*/

const path = require('path')
const util = require('util')
var test = process.argv.slice(2)[0] || false;
var next = process.argv.slice(3)[0] || false;
// var util = require('util');

// var fs = require('fs');


var segmenter = require('./index');

if (!test) log('?');

console.time('_segmenter');

const PouchDB = require('pouchdb')
// PouchDB.plugin(require('pouchdb-adapter-node-websql'))
let dpath = path.join('/home/michael/.config/laoshi/pouchdb/chinese')
log('DPATH', dpath)
let remote = new PouchDB('http:\/\/localhost:5984/chinese')
// let db = PouchDB(dpath, {adapter: 'websql'})
let db = new PouchDB(dpath)

segmenter(db, test, function(err, res) {
    log('SEG res: ==============>>');
    log(res);
    console.timeEnd('_segmenter');
});

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}
