const Timeline = require('../lib/index')
const colors = require('colors')
const test = require("ava")

function sleep(time) {
  const startTime = Date.now()
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(Date.now() - startTime)
    }, time)
  })
}


function makeTimeCompare(caseID, startTime){
  return function(time, expect){
    const precision = Math.abs(time - expect),
          passedTime = Math.max(Date.now() - startTime, 100),
          percent = precision / passedTime

    let color = colors.green,
        pass = true

    if(percent > 0.05 && percent <= 0.10){
      color = colors.cyan
    }
    if(percent > 0.10 && percent <= 0.20){
      color = colors.yellow
    }
    if(percent > 0.20){
      color = colors.red
      pass = false
    }

    console.log(color(`${caseID} - actual: ${time}, expect: ${expect}, precision: ${precision} | ${percent.toFixed(2)}`))

    return pass    
  }
}

function _case(fn){
  const caseID = _case.caseID || 0
  _case.caseID = caseID + 1
  return async function(t){
    const startTime = Date.now()
    t.time_compare = makeTimeCompare(caseID, startTime)
    return await fn(t)
  }
}

function _caseSync(fn){
  const caseID = _case.caseID || 0
  _case.caseID = caseID + 1
  return function(t){
    const startTime = Date.now()
    t.time_compare = makeTimeCompare(caseID, startTime)
    return fn(t)
  }
}

test('default timeline', _case(async (t) => {
  t.plan(2)

  const timeline = new Timeline(),
        startTime = timeline.globalTime

  t.truthy(t.time_compare(timeline.currentTime, 0))
  await sleep(50)

  t.truthy(t.time_compare(timeline.currentTime, timeline.globalTime - startTime))
}))

test('timeline originTime', _case(async (t) => {
  t.plan(2)

  const timeline = new Timeline({originTime: 50})

  t.truthy(t.time_compare(timeline.currentTime, -50))

  const now = timeline.currentTime
  let passedTime = await sleep(100)

  t.truthy(t.time_compare(timeline.currentTime - now, passedTime))
}))

test('timeline paused', _case(async (t) => {
  t.plan(1)

  const timeline = new Timeline()

  await sleep(50)

  timeline.playbackRate = 0
  const current = timeline.currentTime

  await sleep(50)

  t.truthy(t.time_compare(timeline.currentTime, current))
}))

test('timeline playbackRate', _case(async (t) => {
  t.plan(1)

  const timeline = new Timeline()
  let passedTime = await sleep(50)

  timeline.playbackRate = 0
  await sleep(50)

  timeline.playbackRate = 2.0
  passedTime += await sleep(50) * 2

  timeline.playbackRate = -1.0
  passedTime -= await sleep(150)

  t.truthy(t.time_compare(timeline.currentTime, passedTime))
}))

test('timeline entropy', _case(async (t) => {
  const timeline = new Timeline()
  let passedTime = await sleep(50)

  timeline.playbackRate = 2.0
  passedTime += await sleep(50) * 2

  timeline.playbackRate = -3.0
  passedTime += await sleep(50) * 3

  t.truthy(t.time_compare(timeline.entropy, passedTime))
}))

test('entropy and playRate', _case(async (t) => {
  t.plan(3)

  const timeline = new Timeline()
  let passedTime = await sleep(50)
  
  let passedEntropy = passedTime

  t.truthy(t.time_compare(timeline.entropy, timeline.currentTime))

  timeline.playbackRate = -2
  let passed = await sleep(50)

  passedTime -= passed * 2
  passedEntropy += passed * 2

  t.truthy(t.time_compare(timeline.currentTime, passedTime))
  t.truthy(t.time_compare(timeline.entropy, passedEntropy))
}))


test('seek entropy', _case(async (t) => {
  t.plan(3)

  const timeline = new Timeline()
  let passedTime = await sleep(50)

  timeline.playbackRate = 2.0
  let passedTime2 = passedTime + await sleep(50) * 2

  let idx = timeline.seekTimeMark(10)
  t.is(idx, 0)

  idx = timeline.seekTimeMark(passedTime + 25)
  t.is(idx, 1)

  timeline.currentTime = 3.0
  await sleep(100)

  idx = timeline.seekTimeMark(passedTime2 + 50)
  t.is(idx, 2)
}))

test('seek time', _case(async (t) => {
  const timeline = new Timeline({playbackRate: 2}),
        now = timeline.globalTime

  let localTime = timeline.seekLocalTime(200)

  t.truthy(t.time_compare(localTime, 200))

  let globalTime = timeline.seekGlobalTime(300)

  t.truthy(t.time_compare(globalTime - now, 150))
}))

test.cb('timeline setTimeout time', _caseSync(t => {
  t.plan(1)

  const timeline = new Timeline()
  timeline.playbackRate = -2

  const now = timeline.globalTime

  timeline.setTimeout(() => {
    let passedTime = timeline.globalTime - now

    t.truthy(t.time_compare(timeline.currentTime, passedTime * -2))
    t.end()
  }, {time: -100})
}))

test.cb('timeline setTimeout entropy', _caseSync(t => {
  t.plan(2)

  const timeline = new Timeline()
  let now = timeline.globalTime

  timeline.setTimeout(() => {
    let passedTime = timeline.globalTime - now

    t.truthy(Math.abs(timeline.currentTime, passedTime))
    
    timeline.playbackRate = -2

    now = timeline.globalTime
    timeline.setTimeout(() => {
      let passedTime2 = timeline.globalTime - now
      passedTime2 *= 2

      t.truthy(t.time_compare(timeline.entropy, passedTime + passedTime2))

      t.end()
    }, {entropy: 100})
  }, {entropy: 100})
}))

test.cb('timeline setTimeout playbackRate', _caseSync(t => {
  const timeline = new Timeline({playbackRate: 2})

  let now = timeline.globalTime

  let passedTime = 0, passedTime2 = 0
  
  setTimeout(() => {
    passedTime += timeline.globalTime - now
    now = timeline.globalTime
    timeline.playbackRate = 1
  }, 200)

  timeline.setTimeout(() => {
    passedTime2 += timeline.globalTime - now
    
    t.truthy(t.time_compare(timeline.currentTime, passedTime * 2 + passedTime2))

    t.end()
  }, 1000)
}))
