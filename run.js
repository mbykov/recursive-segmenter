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

let config = {}
config.dtype = 'chinese'
let rootdir = path.join(__dirname, '../..')
config.upath = '.config/morpheus-eastern'
let folder = path.resolve(rootdir, config.upath, config.dtype)
config.dbs = jetpack.list(folder)
config.folder = folder

log(config.dbs)

let dbs = createDbs(config)
log('dbs', dbs.length)

function createDbs(config) {
    let dbs = config.dbs
    let databases = []
    dbs.forEach(dn => {
        let dpath = path.resolve(config.folder, dn)
        let dstate = jetpack.exists(dpath)
        if (dstate) {
            let db = new PouchDB(dpath)
            db.dname = dn
            databases.push(db)
            // log('D', db)
        } else {
            log('NO DB', dn, dpath)
        }
    })
    return databases
}


segmenter(dbs, test, function(err, res) {
    log('SEG res: ==============>>');
    console.log(util.inspect(res, {showHidden: false, depth: 3}))
    // console.log(util.inspect(res[0].segs[3], {showHidden: false, depth: 3}))
    console.timeEnd('_segmenter');
});

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}
