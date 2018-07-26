import Timeline from '../src/index'
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

test('nowtime', _case(async (t) => {
  const performance = global.performance
  if(performance){
    global.performance = null
  } else {
    global.performance = {
      now: () => Date.now()
    }
  }

  const timeline = new Timeline()
  t.truthy(t.time_compare(timeline.globalTime, Date.now()))

  global.performance = performance
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
  t.plan(5)

  const timeline = new Timeline()
  let passedTime = await sleep(50)

  timeline.playbackRate = 2.0
  let passedTime2 = passedTime + await sleep(50) * 2

  let idx = timeline.seekTimeMark(10)
  t.is(idx, 0)

  idx = timeline.seekTimeMark(passedTime + 25)
  t.is(idx, 1)

  idx = timeline.seekTimeMark(0)
  t.is(idx, 0)

  timeline.playbackRate = 3.0
  await sleep(100)

  idx = timeline.seekTimeMark(passedTime2 + 50)
  t.is(idx, 2)

  idx = timeline.seekTimeMark(Infinity)
  t.is(idx, 2)
}))

test('set entropy', _case(async (t) => {
  const timeline = new Timeline()
  const passedTime = await sleep(50)
  timeline.playbackRate = 2
  const passedTime2 = await sleep(100)
  t.truthy(t.time_compare(timeline.currentTime, passedTime + passedTime2 * 2))

  timeline.entropy = 25
  const globalTime25 = timeline.seekGlobalTime(25)
  const localTime25 = timeline.seekLocalTime(25)

  await sleep(10)
  t.truthy(t.time_compare(timeline.currentTime - localTime25, (timeline.globalTime - globalTime25) * 2))
}))

test('set entropy 2', _case(async (t) => {
  const timeline = new Timeline()
  timeline.entropy = 100
  timeline.currentTime = 100
  timeline.entropy = 200

  let localTime = timeline.seekLocalTime(100)
  t.truthy(t.time_compare(localTime, 0))
}))

test('seek time', _case(async (t) => {
  t.plan(2)

  const timeline = new Timeline({playbackRate: 2}),
        now = timeline.globalTime

  let localTime = timeline.seekLocalTime(200)

  t.truthy(t.time_compare(localTime, 200))

  let globalTime = timeline.seekGlobalTime(300)

  t.truthy(t.time_compare(globalTime - now, 150))
}))

test('seek time 2', _case(async (t) => {
  t.plan(6)

  const timeline = new Timeline({playbackRate: 2})
  let passedTime = await sleep(50)
  timeline.playbackRate = 1
  let passedTime2 = await sleep(100)
  timeline.playbackRate = -1
  let passedTime3 = await sleep(100)

  let now = timeline.globalTime
  let localTime = timeline.seekLocalTime(25),
      globalTime25 = timeline.seekGlobalTime(25),
      globalTime0 = timeline.seekGlobalTime(0)

  t.truthy(t.time_compare(localTime, 25))
  t.truthy(t.time_compare(globalTime25 - globalTime0, 12.5))

  localTime = timeline.seekLocalTime(passedTime * 2 + 50)
  let globalTime100 = timeline.seekGlobalTime(passedTime * 2 + 50)

  t.truthy(t.time_compare(localTime, passedTime * 2 + 50))
  t.truthy(t.time_compare(globalTime100 - globalTime0, passedTime + 50))

  localTime = timeline.seekLocalTime(passedTime * 2 + passedTime2 + 50)
  let globalTime200 = timeline.seekGlobalTime(passedTime * 2 + passedTime2 + 50)
  t.truthy(t.time_compare(localTime, passedTime * 2 + passedTime2 - 50))
  t.truthy(t.time_compare(globalTime200 - globalTime0, passedTime + passedTime2 + 50))
}))

test('set time', _case(async (t) => {
  const timeline = new Timeline({playbackRate: 2})
  let passedTime = await sleep(50)

  t.truthy(t.time_compare(timeline.currentTime, passedTime * 2))
  
  timeline.playbackRate = -1
  timeline.currentTime = 0
  passedTime = await sleep(100)

  t.truthy(t.time_compare(timeline.currentTime, -passedTime))
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
  }, {delay: -100})
}))

test.cb('timeline setTimeout time 2', _caseSync(t => {
  t.plan(1)

  const timeline = new Timeline()
  timeline.playbackRate = 0

  const now = timeline.globalTime

  timeline.setTimeout(() => {
    let passedTime = timeline.globalTime - now

    t.truthy(t.time_compare(timeline.currentTime, (passedTime - idleTime) * -2))
    t.end()
  }, {delay: -100})

  let n = timeline.globalTime, idleTime = 0
  setTimeout(() => {
    idleTime = timeline.globalTime - n
    timeline.playbackRate = -2
  }, 100)
}))

test.cb('timeline setInterval & clearInterval', _caseSync(t => {
  t.plan(2)
  const timeline = new Timeline({playbackRate: 2})

  let i = 0

  const now = timeline.globalTime
  const id = timeline.setInterval(() => {
    i++
    if(i >= 5){
      timeline.clearInterval(id)
      t.truthy(t.time_compare(timeline.currentTime, (timeline.globalTime - now) * 2))
      setTimeout(() => {
        t.is(i, 5)
        t.end()
      }, 500)
    }
  }, 100)
}))

test.cb('timeline clear', _caseSync(t => {
  t.plan(4)
  let i = 0, j = 0
  const timeline = new Timeline()
  timeline.setInterval(() => {
    i++
  }, 200)
  timeline.setInterval(() => {
    j++
  }, 300)
  setTimeout(() => {
    timeline.clear()
    t.is(i, 2)
    t.is(j, 1)
  }, 500)
  setTimeout(() => {
    t.is(i, 2)
    t.is(j, 1)
    t.end()    
  }, 1000)
}))

test.cb('timeline setInterval & clearInterval 2', _caseSync(t => {
  t.plan(2)
  const timeline = new Timeline({playbackRate: -2})

  let i = 0

  const now = timeline.globalTime
  const id = timeline.setInterval(() => {
    i++
    if(i >= 5){
      timeline.clearTimeout(id)
      t.truthy(t.time_compare(timeline.currentTime, (timeline.globalTime - now) * -2))
      setTimeout(() => {
        t.is(i, 5)
        t.end()
      }, 500)
    }
  }, 100)
}))

test.cb('timeline interval change playbackRate', _caseSync(t => {
  t.plan(9)
  const timeline = new Timeline({playbackRate: 1})

  let i = 0
  let now = timeline.globalTime
  const id = timeline.setInterval(() => {
    i++
    if(i >= 20){
      timeline.clearTimeout(id)
      setTimeout(() => {
        t.is(i, 20)
        t.end()
      }, 500)      
    }

    if(i % 5 == 0){
      t.is(timeline.playbackRate, Math.round(i / 5))
      t.truthy(t.time_compare(timeline.currentTime, (timeline.globalTime - now) * timeline.playbackRate))
      timeline.playbackRate++
      now = timeline.globalTime
      timeline.currentTime = 0
    }
  }, {entropy: 100})
}))

test.cb('timeline interval change playbackRate 2', _caseSync(t => {
  t.plan(20)
  const timeline = new Timeline({playbackRate: 2})

  let i = 0, count = 0
  const now = timeline.globalTime
  const id = timeline.setInterval(() => {
    count++
    if(count <= 5){
      i = Math.round(timeline.currentTime / 200)
    } else {
      i = 10 - Math.round(timeline.currentTime / 200)
    }
    t.is(count, i)
    i = Math.round((timeline.globalTime - now) / 100)
    t.is(count, i)
    if(count >= 5){
      timeline.playbackRate = -2
    }
    if(count >= 10){
      timeline.clearTimeout(id)
      t.end()
    }
  }, {entropy: 200})
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

test.cb('timeline setTimeout heading', _caseSync(t => {
  const timeline = new Timeline()
  const now = timeline.globalTime

  timeline.setTimeout(() => {
    t.truthy(t.time_compare(timeline.globalTime - now, 550))
    t.truthy(t.time_compare(timeline.currentTime, 500))
    t.end()
  }, {delay: 500, heading: false})
  
  setTimeout(() => {
    timeline.playbackRate = -2
    setTimeout(() => {
      timeline.playbackRate = 2
    }, 100) 
  }, 200)
}))

test('timeline fork', _case(async t => {
  const timeline = new Timeline({playbackRate: 2}),
        timeline2 = timeline.fork({playbackRate: 3})

  const passedTime = await sleep(200)

  t.truthy(t.time_compare(timeline.entropy, passedTime * 2))
  t.truthy(t.time_compare(timeline2.entropy, passedTime * 6))
}))

test.cb('timeline fork setInterval & clearInterval', _caseSync(t => {
  t.plan(3)
  const baseTimeline = new Timeline({playbackRate : 2}),
        timeline = new Timeline(baseTimeline) // the same as baseTimeline.fork()

  let i = 0

  const now = timeline.globalTime, baseNow = baseTimeline.globalTime
  const id = timeline.setInterval(() => {
    i++
    if(i >= 5){
      timeline.clearInterval(id)
      t.truthy(t.time_compare(timeline.currentTime, (timeline.globalTime - now) * 2))
      t.truthy(t.time_compare(timeline.currentTime, (baseTimeline.globalTime - baseNow) * 4))
      setTimeout(() => {
        t.is(i, 5)
        t.end()
      }, 500)
    }
  }, 100)
  
  timeline.playbackRate = 2
}))

test.cb('timeline passTo', _caseSync(t => {
  const timeline = new Timeline({playbackRate: 0})

  t.plan(1)
  timeline.setTimeout(evt => {
    t.truthy(t.time_compare(timeline.currentTime, 1000))
    t.end()
  }, 500)

  timeline.currentTime = 1000
}))
