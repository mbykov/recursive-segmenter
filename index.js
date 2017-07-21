// morpheus v.0.4.0

var _ = require('lodash');
var debug = (process.env.debug == 'true') ? true : false;

const PouchDB = require('pouchdb')

// let db_greek, db_flex

// let db = new PouchDB('http://diglossa.org:5984/chinese', {
let db = new PouchDB('http://localhost:5984/chinese', {
    ajax: {
        cache: false,
        timeout: 60000
    }
})


module.exports = segmenter;

// - padas
// забрать dicts
// - chains for dicts

function segmenter(str, cb) {
    let padas = parsePadas(str)
    // log('==UKEYS==', padas.toString())

    db.query('chinese/byDict', {
        keys: padas,
        include_docs: true
    }).then(function (res) {
        if (!res || !res.rows) throw new Error('no term result')
        let docs = res.rows.map(function(row) { return row.doc})
        let gdoc = compactDocs(str, docs)

        var chains = []
        var chain
        function rec(gdoc, pos = 0) {
            let starts = getByPos(gdoc, pos)
            if (!starts.length) {
                let clone = JSON.parse(JSON.stringify(chain));
                chains.push(clone);
                chain = null
                return
            }
            starts.forEach(start => {
                if (!chain && pos !== 0) return
                if (!chain) chain = []
                chain.push(start.dict)
                let nextpos = pos + start.size
                rec(gdoc, nextpos)
            })
        }
        rec(gdoc)
        let sizes = chains.map(ch => ch.length)
        let max = _.min(sizes)
        let longests = _.filter(chains, ch => ch.length == max)
        // log('CH=>', longests)
        cb(null, longests)
    }).catch(function (err) {
        log('queryTERMS ERRS', err);
        cb(err, null)
    })
}

function getByPos(gdoc, pos) {
    let starts = []
    for (let key in gdoc) {
        let value = gdoc[key][0]
        if (value.start == pos) starts.push({dict: key, start: pos, size: value.size }) // , docs: gdoc[key]
    }
    return _.sortBy(starts, ['size']).reverse(); //_.sortBy(starts, 'size')
}

function compactDocs(str, docs) {
    docs.forEach(doc => {
        doc.act = (str.indexOf(doc.trad) !== -1) ? doc.trad : doc.simp
        doc.start = str.indexOf(doc.act)
    })
    return _.groupBy(docs, 'act')
}

function parsePadas(str) {
    let h, t
    let padas = []
    for (let idx = 1; idx < str.length+1; idx++) {
        h = str.slice(0, idx)
        t = str.slice(idx)
        padas.push(h)
        let h_
        for (let idy = 1; idy < t.length+1; idy++) {
            h_ = t.slice(0, idy)
            padas.push(h_)
        }
    }
    return padas
}


function log() { console.log.apply(console, arguments); }

/*

  新华社北京 = 新华社 北京

  We could emphasize some classes, for example, a verb. So, as I do in Greek for names.

  But, probably, it is difficult to do this automatically, before a complete analysis of the proposal, which is currently not available for us.


*/
