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

function segmenter(str, cb) {
    let clauses = parseClause(str)
    let keys = clauses.map(cl => parseKeys(cl))
    keys = _.uniq(_.flatten(keys))
    // log('==UKEYS==', keys.toString())
    db.query('chinese/byDict', {
        keys: keys,
        include_docs: true
    }).then(function (res) {
        if (!res || !res.rows) throw new Error('no term result')
        let docs = res.rows.map(function(row) { return row.doc})
        let seg4cl = {}
        clauses.forEach(cl => {
            let gdoc = compactDocs(cl, docs)
            seg4cl[cl] = longest(cl, gdoc)
        })
        cb(null, seg4cl)
    }).catch(function (err) {
        log('queryTERMS ERRS', err);
        cb(err, null)
    })
}

// 新华社北京
// 第三十七次会议 并发表重要讲话
// 第三十各地区要切实把 - должно быть два решения, поскольку 各地区要切实把 - два

/*

*/

function longest(str, gdoc) {
    let chains = []
    let rec = (gdoc, chain, pos) => {
        let starts = getByPos(gdoc, pos)
        starts.forEach(start => {
            chain = chain || []
            chain.push(start.dict)
            let npos = start.start + start.size
            if (npos == str.length) {
                let clone = _.clone(chain)
                chains.push(clone)
            }
            rec(gdoc, chain, npos)
            chain.pop()
        })
    }
    rec(gdoc, null, 0)
    // return chains
    let sizes = chains.map(ch => ch.length)
    let max = _.min(sizes)
    return _.filter(chains, ch => ch.length == max)
}

function getByPos(gdoc, pos) {
    let starts = []
    for (let key in gdoc) {
        let value = gdoc[key][0]
        if (value.start === pos) starts.push({dict: key, start: pos, size: value.size }) // , docs: gdoc[key]
    }
    return starts
    // return _.sortBy(starts, ['size']).reverse(); //_.sortBy(starts, 'size')
}

function compactDocs(str, docs) {
    docs.forEach(doc => {
        doc.act = (str.indexOf(doc.trad) !== -1) ? doc.trad : doc.simp
        doc.start = str.indexOf(doc.act)
    })
    return _.groupBy(docs, 'act')
}

function parseKeys(str) {
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

function parseClause(str) {
    return str.split(' ')
}


function log() { console.log.apply(console, arguments); }

/*

  新华社北京 = 新华社 北京

  We could emphasize some classes, for example, a verb. So, as I do in Greek for names.

  But, probably, it is difficult to do this automatically, before a complete analysis of the proposal, which is currently not available for us.


*/
