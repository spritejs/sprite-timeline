import Timeline, {nowtime} from '../src/index'
const colors = require('colors')
const test = require("ava")

function makeTimeCompare(startTime) {
  return function (time, expect) {
    const precision = Math.abs(time - expect),
      passedTime = Math.max(Date.now() - startTime, 100),
      percent = precision / passedTime

    let color = colors.green,
      pass = true

    if(percent > 0.05 && percent <= 0.10) {
      color = colors.cyan
    }
    if(percent > 0.10 && percent <= 0.20) {
      color = colors.yellow
    }
    if(percent > 0.20) {
      color = colors.red
      pass = false
    }

    return pass
  }
}

function _caseSync(fn) {
  return function (t) {
    const startTime = Date.now()
    t.time_compare = makeTimeCompare(startTime)
    return fn(t)
  }
}
test('default nowtime', _caseSync(t => {

  const timeline = new Timeline();

  // no pass ntime will default to nowtime()
  t.truthy(t.time_compare(timeline.getCurrentTime(), 0));
  t.truthy(t.time_compare(timeline.getGlobalEntropy(), 0));
}))


test('timeline originTime', t => {
  const timeline = new Timeline({ntime: 0, originTime: 50})
  t.truthy(timeline.getCurrentTime(10) === -40);
})

test('timeline paused', t => {
  const timeline = new Timeline({playbackRate: 0, ntime: 0});
  t.truthy(timeline.getCurrentTime(100) === 0);
})

test('timeline playbackRate', t => {
  var timeline = new Timeline({ntime: 0, playbackRate: 2})
  t.truthy(timeline.getCurrentTime(100) === 200);


  timeline = new Timeline({ntime: 0, playbackRate: -2})
  t.truthy(timeline.getCurrentTime(100) === -200);
})

test('timeline entropy', t => {
  const timeline = new Timeline({ntime: 0, playbackRate: -2});

  t.truthy(timeline.getEntropy(200) === 400);
})

test('timeline fork', t => {
  const timeline = new Timeline({playbackRate: 2, ntime: 0}),
    timeline2 = timeline.fork({playbackRate: 3, ntime: 80})

  const passedTime = 100;
  t.truthy(timeline.getEntropy(passedTime) === passedTime * 2)
  t.truthy(timeline2.getEntropy(passedTime) === 20 * 6)
})