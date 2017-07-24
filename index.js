// morpheus v.0.4.0

const util = require('util')
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
            chain.push(start)
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

    let sizes = chains.map(ch => ch.length)
    let min = _.min(sizes)
    let longests = _.filter(chains, ch => ch.length == min)
    combined(min, longests)
    return []
}

function combined(size, chains) {
    // log('CHs', chains)
    // return
    let res = []
    let hash = {}
    for (let idx = 0; idx < size; idx++) {
        // log('---', idx)
        if (!hash[idx] ) hash[idx] = []
        chains.forEach(ch => {
            // log('C', ch[idx])
            hash[idx].push(ch[idx])
        })
    }
    log(hash)
    let restricted = []
    for (let idx = 0; idx < size; idx++) {
        if (restricted.includes(idx)) continue
        let dicts = _.uniq(hash[idx].map(seg => seg.dict))
        let curs = hash[idx]
        if (dicts.length == 1) {
            res.push([curs[0]])
        } else {
            let nexts = hash[idx+1]
            dicts.forEach((dict, idy) => {
                let r = [curs[idy], nexts[idy]]
                res.push(r)
            })
            idx++
        }
    }
    log('------- res:')
    log(res)
    let hash1 = {}
    res.forEach(rs => {
        if (rs.length == 1) {
            hash1[rs[0].dict] = rs
        } else {
            let reg = rs.map(r => r.dict).join('')
            if (!hash1[reg]) hash1[reg] = []
            hash1[reg].push(rs)
        }
    })
    log('------- h1:')
    log(hash1)
    // 第三十各地区要切实把
}

function getByPos(gdoc, pos) {
    let starts = []
    for (let key in gdoc) {
        let value = gdoc[key][0]
        if (value.start === pos) starts.push({dict: key, start: pos, size: value.size, docs: gdoc[key] })
    }
    return starts
}

function compactDocs(str, docs) {
    docs.forEach(doc => {
        doc.dict = (str.indexOf(doc.trad) !== -1) ? doc.trad : doc.simp
        doc.start = str.indexOf(doc.dict)
    })
    return _.groupBy(docs, 'dict')
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

function p(o) {
    console.log(util.inspect(o, false, null))
}


// console.log(util.inspect(myObject, {showHidden: false, depth: null}))

// alternative shortcut

/*

  新华社北京 = 新华社 北京

  We could emphasize some classes, for example, a verb. So, as I do in Greek for names.

  But, probably, it is difficult to do this automatically, before a complete analysis of the proposal, which is currently not available for us.


*/
