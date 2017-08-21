// morpheus-eastern segmenter

// const path = require('path')
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
    return {segs: segs, gdocs: gdocs}
}

// ambies get idx from chain, regular segs from gdocs:
function setDictIdx(str, chain, gdocs) {
    chain.forEach((seg, idx) => {
        let gidx = _.findIndex(gdocs, doc => { return doc.dict == seg.dict })
        seg.idx = gidx
        if (seg.dict) return
        seg.idx = idx
        let start = (chain[idx-1]) ? chain[idx-1].start + chain[idx-1].size : 0
        let finish = (chain[idx+1]) ? chain[idx+1].start : str.length
        let dict = str.slice(start, finish)
        seg.dict = dict
        seg.start = start
        // seg.finish = finish
        seg.size = dict.length
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
            let uambis = {}
            ambis.forEach(ambi => {
                let key = ambi.map(seg => { return seg.dict}).join('-')
                uambis[key] = ambi
            })
            let clean = _.values(uambis)
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

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}
