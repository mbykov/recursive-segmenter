// morpheus-eastern segmenter

// const path = require('path')
const util = require('util')
var _ = require('lodash');
var debug = (process.env.debug == 'true') ? true : false;

export function segmenter(str, gdocs) {
    // let gdocs = compactDocs(docs)
    // log('=GD=', gdocs)
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
    log('M', min)
    let shortests = _.filter(chains, ch => ch.length == min)
    // log('LS', shortests.length)
    let clean = combined(min, shortests)
    // log('CL', clean)
    setDict(str, clean, gdocs)
    return clean
}

function setDict(str, chain, gdocs) {
    chain.forEach((seg, idx) => {
        let sidx = _.findIndex(gdocs, doc => { return doc.dict == seg.dict })
        seg.idx = sidx
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


// function parseKeys(str) {
//     let h, t
//     let padas = []
//     for (let idx = 1; idx < str.length+1; idx++) {
//         h = str.slice(0, idx)
//         t = str.slice(idx)
//         padas.push(h)
//         let h_
//         for (let idy = 1; idy < t.length+1; idy++) {
//             h_ = t.slice(0, idy)
//             padas.push(h_)
//         }
//     }
//     return padas
// }

function log() { console.log.apply(console, arguments); }

function p(o) {
    console.log(util.inspect(o, false, null))
}

// function singles(gdocs){
//     return _.filter(gdocs, doc => doc.size == 1)
// }
