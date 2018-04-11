const Timeline = require('../lib/index')

const t = new Timeline()

const startTime = Date.now()

t.setTimeout(() => {
  console.log(t.currentTime, Date.now() - startTime)
}, 500)

setTimeout(() => {
  t.playbackRate = -2
}, 200)