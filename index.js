// morpheus-eastern segmenter

var _ = require('lodash')
// import _ from 'lodash'
// var debug = (process.env.debug == 'true') ? true : false

module.exports = segmenter

function segmenter (str, docs, only) {
  let gdocs = setDocs(str, docs, only)
  gdocs = addHoles(str, gdocs)

  let chains = []
  let rec = (gdocs, chain, pos) => {
    let starts = _.filter(gdocs, doc => doc.start === pos)
    starts.forEach(start => {
      chain = chain || []
      chain.push(start)
      let npos = start.start + start.size
      if (npos === str.length) {
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
  let shortests = _.filter(chains, ch => ch.length === min)
  let segs = combined(min, shortests)
  setAmbisIdx(str, segs)
  return segs
}

function addHoles (str, docs) {
  let holes = str
  let dicts = docs.map(s => { return s.seg })
  dicts.forEach(dict => {
    let re = new RegExp(dict, 'g')
    holes = holes.replace(re, ' ')
  })
  holes = _.compact(holes.replace(/\s+/, ' ').split(' '))
  holes.forEach(hole => {
    let indices = []
    let idx = str.indexOf(hole)
    while (idx !== -1) {
      indices.push(idx)
      idx = str.indexOf(hole, idx + 1)
    }
    indices.forEach(idx => {
      let res = {seg: hole, size: hole.length, start: idx, hole: true}
      docs.push(res)
    })
  })
  return _.sortBy(docs, 'start')
}

function setDocs (str, dicts, only) {
  let cdocs = []
  dicts.forEach(dict => {
    if (only && dict === str) return // dict is this only str
    let indices = []
    let idx = str.indexOf(dict)
    while (idx !== -1) {
      indices.push(idx)
      idx = str.indexOf(dict, idx + 1)
    }
    indices.forEach(idx => {
      let res = {seg: dict, size: dict.length, start: idx}
      cdocs.push(res)
    })
  })
  return _.sortBy(cdocs, 'start')
}

// ambies get idx from chain, regular segs from gdocs:
function setAmbisIdx (str, segs) {
  segs.forEach(s => {
    if (!s.ambis) return
    let indices = []
    let idx = str.indexOf(s.seg)
    while (idx !== -1) {
      indices.push(idx)
      idx = str.indexOf(s.seg, idx + 1)
    }
    indices.forEach(idx => {
      s.start = idx
      s.size = s.seg.length
      // let res = {seg: dict, size: dict.length, start: idx}
      // cdocs.push(res)
    })
  })
}

function combined (size, chains) {
  let res = []
  let hash = {}
  for (let idx = 0; idx < size; idx++) {
    if (!hash[idx]) hash[idx] = []
    chains.forEach(ch => {
      hash[idx].push(ch[idx])
    })
  }

  let cont = true
  for (let idx = 0; idx < size; idx++) {
    let curs = hash[idx]
    let _ids = _.uniq(hash[idx].map(s => s.seg))
    // let _ids = _.keys(curs)
    if (_ids.length === 1) {
      cont = true
      res.push(curs[0])
    } else {
      let ambis = []
      curs.forEach((cur, idy) => {
        ambis.push([cur])
      })
      for (let idy = idx + 1; idy < size; idy++) {
        if (!cont) continue
        let _ids = _.uniq(hash[idy].map(s => s.seg))
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
        let key = ambi.map(s => { return s.seg }).join('-')
        uambis[key] = ambi
      })
      let clean = _.values(uambis)
      let ckeys = _.keys(uambis)
      let seg = ckeys[0].split('-').join('')
      res.push({ambis: clean, seg: seg})
    }
  }
  return res
}

function log () { console.log.apply(console, arguments) }
log('')
