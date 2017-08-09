const Timeline = require('../lib/index')

const test = require("ava")

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

test('1 - default timeline', async (t) => {
  const timeline = new Timeline()

  t.truthy(timeline.currentTime < 20)

  const current = timeline.globalTime

  await sleep(50)

  t.truthy(Math.abs(timeline.currentTime - (timeline.globalTime - current)) < 5)
})

test('2 - timeline originTime', async (t) => {
  const timeline = new Timeline({originTime: 50})

  t.truthy(timeline.currentTime < -45)
  t.truthy(timeline.currentTime >= -50)

  await sleep(100)

  t.truthy(Math.abs(timeline.currentTime - 50) < 30)
})

test('3 - timeline paused', async (t) => {
  const timeline = new Timeline()

  await sleep(50)

  timeline.playbackRate = 0
  const current = timeline.currentTime

  console.log('3 - current: %s', current)

  await sleep(50)

  t.truthy(timeline.currentTime === current)
})

test('4 - timeline playbackRate', async (t) => {
  const timeline = new Timeline()

  await sleep(50)

  timeline.playbackRate = 0
  console.log('4 - current: %s', timeline.currentTime)
  await sleep(50)

  timeline.playbackRate = 2.0
  await sleep(50)
  console.log('4 - current: %s', timeline.currentTime)

  timeline.playbackRate = -1.0
  await sleep(150)
  console.log('4 - current: %s', timeline.currentTime)

  t.truthy(Math.abs(timeline.currentTime) <= 50)
})

test('5 - timeline entropy', async (t) => {
  const timeline = new Timeline()
  await sleep(50)

  timeline.playbackRate = 2.0
  await sleep(50)

  timeline.playbackRate = -3.0
  await sleep(50)

  console.log('5 - current: %s', timeline.currentTime)
  console.log('5 - entropy: %s', timeline.entropy)

  t.truthy(Math.abs(timeline.entropy - 300) <= 150)
})

test('6 - seek entropy', async (t) => {
  const timeline = new Timeline()
  await sleep(50)

  timeline.playbackRate = 2.0
  await sleep(50)

  let idx = timeline.seekTimeMark(10)
  t.is(idx, 0)

  idx = timeline.seekTimeMark(80)
  t.is(idx, 1)

  timeline.currentTime = 3.0
  await sleep(100)
  idx = timeline.seekTimeMark(200)

  t.is(idx, 2)
})

test.cb('6 - timeline setTimeout time', t => {
  const timeline = new Timeline()
  timeline.playbackRate = -2

  const now = timeline.globalTime

  timeline.setTimeout(() => {
    console.log('6 - global: %s', timeline.globalTime - now)
    console.log('6 - current: %s', timeline.currentTime)
    t.truthy(Math.abs(timeline.currentTime + 100) <= 30)
    t.end()
  }, {time: -100})
})

test.cb('7 - timeline setTimeout entropy', t => {
  const timeline = new Timeline()
  timeline.setTimeout(() => {
    console.log('7 - current: %s', timeline.currentTime)
    t.truthy(Math.abs(timeline.currentTime - 100) <= 30)
    t.end()
  }, {entropy: 100})
})

test.cb('8 - timeline setTimeout playbackRate', t => {
  const timeline = new Timeline({playbackRate: 2})

  const now = timeline.globalTime
  
  setTimeout(() => {
    timeline.playbackRate = 1
  }, 200)

  timeline.setTimeout(() => {
    console.log('8 - current: %s', timeline.currentTime)
    console.log('8 - entropy: %s', timeline.entropy)
    console.log('8 - time: %s', timeline.globalTime - now)
    t.truthy(Math.abs(timeline.globalTime - now - 800) <= 100)
    t.end()
  }, 1000)
})
