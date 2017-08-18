// morpheus-eastern segmenter

const path = require('path')
const util = require('util')
var _ = require('lodash');
var debug = (process.env.debug == 'true') ? true : false;

module.exports = segmenter;

function segmenter(dbs, clauses, cb) {
    let keys = []
    clauses.forEach(clause => {
        if (clause.sp) return
        let ckeys = parseKeys(clause.cl)
        keys.push(ckeys)
    })
    keys = _.uniq(_.flatten(keys))
    if (!keys.length) return cb(null, null)

    // log('==UKEYS==', keys.toString())

    Promise.all(dbs.map(function (db) {
        return db.allDocs({
            keys: keys,
            include_docs: true
        }).then(function (res) {
            if (!res || !res.rows) throw new Error('no term result')
            let rdocs = _.compact(res.rows.map(row => { return row.doc}))
            let docs = rdocs.map(rdoc => {
                rdoc.docs.forEach(d => {d.dict = rdoc._id})
                rdoc.docs.forEach(d => {if (!d.trad) d.trad = d.simp })
                rdoc.docs.forEach(d => {d.dname = db.dname, d.type = db.dname.split('-')[0], d.name = db.dname.split('-')[1] })
                return rdoc.docs
            })
            return _.flatten(_.compact(docs))
        }).catch(function (err) {
            log('E1', err)
        })
    })).then(function(arrayOfResults) {
        let flats = _.flatten(_.compact(arrayOfResults))
        // log('A', arrayOfResults )
        let mess = message(clauses, flats)
        // log('M', mess)
        cb(null, mess)
    }).catch(function (err) {
        log('E2', err)
    })
}

function message(clauses, docs) {
    let mess = []
    clauses.forEach(clause => {
        if (clause.sp) mess.push({sp: clause.sp})
        else {
            let gdocs = compactDocs(clause.cl, docs)
            mess.push({cl: clause.cl, segs: longest(clause.cl, gdocs), singles: singles(gdocs)})
        }
    })
    return mess
}

function singles(gdocs){
    return _.filter(gdocs, doc => doc.size == 1)
}

function longest(str, gdocs) {
    let chains = []
    let rec = (gdocs, chain, pos) => {
        let starts = _.filter(gdocs, doc => doc.start == pos)
        starts.forEach(start => {
            chain = chain || []
            chain.push(start)
            let npos = start.start + start.size
            if (npos == str.length) {
                let clone = _.clone(chain)
                chains.push(clone)
            }
            rec(gdocs, chain, npos)
            chain.pop()
        })
    }
    rec(gdocs, null, 0)

    let sizes = chains.map(ch => ch.length)
    let min = _.min(sizes)
    // log('M', min)
    // 和成功实践 - longest.size = 3
    let shortests = _.filter(chains, ch => ch.length == min)
    // shortests = _.uniq(shortests.map(lng => { return JSON.stringify(lng)})).map(lng => { return JSON.parse(lng)})
    // log('L', shortests)
    // log('LS', shortests.length)
    let clean = combined_(min, shortests)
    // log('CL', clean)
    setDict(str, clean)
    return clean
}
// 胆探索和成功实践
// 从人民
// 在构成上可分为单纯字和合体字两大类

function setDict(str, chain) {
    chain.forEach((seg, idx) => {
        if (seg.dict) return
        let start = (chain[idx-1]) ? chain[idx-1].start + chain[idx-1].size : 0
        let finish = (chain[idx+1]) ? chain[idx+1].start : str.length
        let dict = str.slice(start, finish)
        seg.dict = dict
        seg.start = start
        // seg.finish = finish
        seg.size = dict.length
    })
}

function combined_(size, chains) {
    let res = []
    let hash = {}
    for (let idx = 0; idx < size; idx++) {
        if (!hash[idx] ) hash[idx] = []
        chains.forEach(ch => {
            hash[idx].push(ch[idx])
        })
    }
    // log('H', hash)

    let cont = true
    for (let idx = 0; idx < size; idx++) {
        let curs = hash[idx]
        let dicts = _.uniq(hash[idx].map(seg => seg.dict))
        // let dicts = _.keys(curs)
        if (dicts.length == 1) {
            cont = true
            res.push(curs[0])
        } else {
            let ambis = []
            curs.forEach((cur, idy) => {
                ambis.push([cur])
            })
            for (let idy = idx+1; idy < size; idy++) {
                if (!cont) continue
                let dicts = _.uniq(hash[idy].map(seg => seg.dict))
                if (dicts.length > 1) {
                    idx++
                    let curs = hash[idy]
                    curs.forEach((cur, idz) => {
                        ambis[idz].push(cur)
                    })
                } else {
                    cont = false
                }
            }
            // log('AMBIS', ambis)
            let uambis = {}
            ambis.forEach(ambi => {
                let key = ambi.map(seg => { return seg.dict}).join('-')
                uambis[key] = ambi
            })
            // log('UAMBIS', uambis)
            let clean = _.values(uambis)
            // log('CLEAN', clean)
            // let ambi = {ambis: ambis}
            res.push({ambis: clean})
        }
    }
    return res
}

function compactDocs(str, docs) {
    let gdocs = _.groupBy(docs, 'dict')
    let cdocs = []
    for (let dict in gdocs) {
        let indices = []
        let idx = str.indexOf(dict)
        while (idx != -1) {
            indices.push(idx);
            idx = str.indexOf(dict, idx + 1);
        }
        indices.forEach(idx => {
            let res = {dict: dict, size: dict.length, start: idx, docs: gdocs[dict]}
            cdocs.push(res)
        })
    }
    return _.sortBy(cdocs, 'start')
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

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}
