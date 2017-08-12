/*
  imitate call from morpheus-eastern
  runner: node run.js chinese test; ex: node run.js 第三十各地区
*/

const path = require('path')
const util = require('util')
const jetpack = require("fs-jetpack")
var _ = require('lodash');
var test = process.argv.slice(2)[0] || false;

var segmenter = require('./index');

if (!test) log('?');

console.time('_segmenter');

const PouchDB = require('pouchdb')
// // PouchDB.plugin(require('pouchdb-adapter-node-websql'))

// let dpath = path.join('/home/michael/.config/laoshi/pouchdb/chinese')
// log('DPATH', dpath)
// let remote = new PouchDB('http:\/\/localhost:5984/chinese')
// // let db = PouchDB(dpath, {adapter: 'websql'})
// let db = new PouchDB(dpath)

let dbnames = ['chinese-cedict', 'chinese-hande']
let upath = '.config/morpheus-eastern'

if (!dbnames) {
    log('NO DBS')
}

let dbs = createDbs(dbnames)

function createDbs(dbnames) {
    log('creating dbs:')
    let dbs = []
    dbnames.forEach(dn => {
        let dpath = path.resolve(process.env.HOME, upath, dn)
        let dstate = jetpack.exists(dpath)
        if (dstate) {
            let db = new PouchDB(dpath)
            db.dname = dn
            dbs.push(db)
            // log('D', db)
        } else {
            log('NO DB', dn, dpath)
        }
    })
    return dbs
}

segmenter(dbs, test, function(err, res) {
    log('SEG res: ==============>>');
    p(res);
    console.timeEnd('_segmenter');
});

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}
