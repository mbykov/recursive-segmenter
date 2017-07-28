// morpheus for chinese

const util = require('util')
var _ = require('lodash');
var debug = (process.env.debug == 'true') ? true : false;

const PouchDB = require('pouchdb')

let remote = new PouchDB('http://diglossa.org:5984/chinese', {
// let remote = new PouchDB('http://localhost:5984/chinese', {
    ajax: {
        cache: false,
        timeout: 60000
    }
})

// let db = new PouchDB('chinese')
// db.sync(remote)

module.exports = segmenter;

function segmenter(str, cb) {
    let clauses = parseClause(str)
    // cb(null, clauses)
    // return
    let keys = []
    clauses.forEach(clause => {
        if (clause.sp) return
        log(1, clause)
        let ckeys = parseKeys(clause.cl)
        keys.push(ckeys)
    })
    keys = _.uniq(_.flatten(keys))
    // log('==UKEYS==', keys.toString())
    // cb(null, keys)
    // return
    remote.query('chinese/byDict', {
        keys: keys,
        include_docs: true
    }).then(function (res) {
        if (!res || !res.rows) throw new Error('no term result')
        let docs = res.rows.map(function(row) { return row.doc})
        let mess = []
        clauses.forEach(clause => {
            if (clause.sp) mess.push({sp: clause.sp})
            else {
                let gdocs = compactDocs(clause.cl, docs)
                mess.push({cl: clause.cl, segs: longest(clause.cl, gdocs), singles: singles(gdocs)})
            }
        })
        cb(null, mess)
    }).catch(function (err) {
        log('queryTERMS ERRS', err);
        cb(err, null)
    })
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
    let longests = _.filter(chains, ch => ch.length == min)
    return combined(min, longests)
}



function combined(size, chains) {
    let res = []
    let hash = {}
    for (let idx = 0; idx < size; idx++) {
        if (!hash[idx] ) hash[idx] = []
        chains.forEach(ch => {
            hash[idx].push(ch[idx])
        })
    }
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
    let hash1 = {}
    res.forEach((rs, i) => {
        if (rs.length == 1) {
            hash1[rs[0].start] = rs[0]
        } else {
            let reg = rs.map(r => r.dict).join('')
            if (!hash1[rs[0].start]) hash1[rs[0].start] = {dict: reg, start: rs[0].start, ambis: []}
            hash1[rs[0].start].ambis.push(rs)
        }
    })

    let results = []
    for (let pos in hash1) {
        results.push(hash1[pos])
    }
    return results
}

function compactDocs(str, docs) {
    docs.forEach((doc, idx) => {
        doc.dict = (str.indexOf(doc.trad) !== -1) ? doc.trad : doc.simp
    })
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

// https://stackoverflow.com/questions/1366068/whats-the-complete-range-for-chinese-characters-in-unicode
// ck                                   Range       Comment
// CJK Unified Ideographs                  4E00-9FFF   Common
// CJK Unified Ideographs Extension A      3400-4DBF   Rare
// CJK Unified Ideographs Extension B      20000-2A6DF Rare, historic
// CJK Unified Ideographs Extension C      2A700–2B73F Rare, historic
// CJK Unified Ideographs Extension D      2B740–2B81F Uncommon, some in current use
// CJK Unified Ideographs Extension E      2B820–2CEAF Rare, historic
// CJK Compatibility Ideographs            F900-FAFF   Duplicates, unifiable variants, corporate characters
// CJK Compatibility Ideographs Supplement 2F800-2FA1F Unifiable variants

function parseClause(str) {
    // return str.split(' ')
    let clauses = []
    let syms = str.split('')
    let clause, space
    syms.forEach(sym => {
        if (/[\u4E00-\u9FFF]/.test(sym)) {
            if (!clause) clause = []
            clause.push(sym)
            // log('SYM', clause)
            if (space) {
                let str = space.join('')
                clauses.push({sp:str})
                space = null
            }
        } else {
            if (clause) {
                let str = clause.join('')
                clauses.push({cl: str})
                clause = null
            }
            if (!space) space = []
            space.push(sym)
        }
    })
    if (clause) {
        let str = clause.join('')
        clauses.push({cl: str})
    }
    return clauses
}

// 第三十各地区要切 实把
// 新华社北京
// 第三十七次会议 并发表重要讲话

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}


// punctuation \u002E\u002C\u0021\u003B\u00B7\u0020\u0027 - ... middle dot, space, apostrophe
// parens ()[]{-/
// \u0028\u0029\u005B\u005D\u007B\u007D\u002D\u002F
// greek 0370-03FF 1F00–1FFF
// diactitic 0300-036F
function cleanGreek(str) {
    let greek = str.replace(/[^\u002E\u002C\u0021\u003B\u00B7\u0020\u0027\u1F00-\u1FFF\u0370-\u03FF\u0300-\u036F]/gi, '')
    greek = greek.trim().replace(/^\d+/, '').replace(/^\./, '').trim()
    if (!/[\u1F00-\u1FFF\u0370-\u03FF\u0300-\u036F]/.test(greek[0])) return
    return greek
}
