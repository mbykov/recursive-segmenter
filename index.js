// morpheus-eastern segmenter

const util = require('util')
var _ = require('lodash');
var debug = (process.env.debug == 'true') ? true : false;

export function segmenter(str, docs) {
    let gdocs = compactDocs(str, docs)
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
    let shortests = _.filter(chains, ch => ch.length == min)
    let segs = combined(min, shortests)
    setDictIdx(str, segs, gdocs)
  let adocs = _.filter(gdocs, (d) => { return !d.idx && d.idx != 0 })
    return {segs: segs, gdocs: adocs}
}

// ambies get idx from chain, regular segs from gdocs:
function setDictIdx(str, chain, gdocs) {
    chain.forEach((seg, idx) => {
        let gidx = _.findIndex(gdocs, doc => { return doc._id == seg._id })
        seg.idx = gidx
        if (seg._id) return
        seg.idx = idx
        let start = (chain[idx-1]) ? chain[idx-1].start + chain[idx-1].size : 0
        let finish = (chain[idx+1]) ? chain[idx+1].start : str.length
        let _id = str.slice(start, finish)
        // seg._id = _id
        seg.start = start
        // seg.finish = finish
        seg.size = _id.length
    })
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
    // log('H', hash)

    let cont = true
    for (let idx = 0; idx < size; idx++) {
        let curs = hash[idx]
        let _ids = _.uniq(hash[idx].map(seg => seg._id))
        // let _ids = _.keys(curs)
        if (_ids.length == 1) {
            cont = true
            res.push(curs[0])
        } else {
            let ambis = []
            curs.forEach((cur, idy) => {
                ambis.push([cur])
            })
            for (let idy = idx+1; idy < size; idy++) {
                if (!cont) continue
                let _ids = _.uniq(hash[idy].map(seg => seg._id))
                if (_ids.length > 1) {
                    idx++
                    let curs = hash[idy]
                    curs.forEach((cur, idz) => {
                        ambis[idz].push(cur)
                    })
                } else {
                    cont = false
                }
            }
            let uambis = {}
            ambis.forEach(ambi => {
                let key = ambi.map(seg => { return seg._id}).join('-')
                uambis[key] = ambi
            })
            let clean = _.values(uambis)
            res.push({ambis: clean})
        }
    }
    return res
}

function compactDocs(str, docs) {
    let gdocs = _.groupBy(docs, '_id')
    let cdocs = []
    for (let _id in gdocs) {
        let indices = []
        let idx = str.indexOf(_id)
        while (idx != -1) {
            indices.push(idx);
            idx = str.indexOf(_id, idx + 1);
        }
        indices.forEach(idx => {
            let res = {dict: _id, size: _id.length, start: idx, docs: gdocs[_id]}
            cdocs.push(res)
        })
    }
    return _.sortBy(cdocs, 'start')
}

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}
