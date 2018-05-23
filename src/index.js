import {nowtime, formatDelay} from './utils'

const defaultOptions = {
  originTime: 0,
  playbackRate: 1.0,
}

const _timeMark = Symbol('timeMark'),
  _playbackRate = Symbol('playbackRate'),
  _timers = Symbol('timers'),
  _alarms = Symbol('alarms'),
  _originTime = Symbol('originTime'),
  _setTimer = Symbol('setTimer'),
  _parent = Symbol('parent')

class Timeline {
  constructor(options, parent) {
    if(options instanceof Timeline) {
      parent = options
      options = {}
    }

    options = Object.assign({}, defaultOptions, options)

    if(parent) {
      this[_parent] = parent
    }

    // timeMark records the reference points on timeline
    // Each time we change the playbackRate or currentTime or entropy
    // A new timeMark will be generated
    // timeMark sorted by entropy
    // If you reset entropy, all the timeMarks behind the new entropy
    // should be dropped
    this[_timeMark] = [{
      globalTime: this.globalTime,
      localTime: -options.originTime,
      entropy: -options.originTime,
      playbackRate: options.playbackRate,
      globalEntropy: 0,
    }]

    if(this[_parent]) {
      this[_timeMark][0].globalEntropy = this[_parent].entropy
    }

    this[_originTime] = options.originTime
    this[_playbackRate] = options.playbackRate
    this[_timers] = new Map()
    this[_alarms] = new Map()
  }
  get lastTimeMark() {
    return this[_timeMark][this[_timeMark].length - 1]
  }
  get currentTime() {
    const {localTime, globalTime} = this.lastTimeMark
    return localTime + (this.globalTime - globalTime) * this.playbackRate
  }
  set currentTime(time) {
    const timeMark = {
      globalTime: this.globalTime,
      localTime: time,
      entropy: this.entropy,
      playbackRate: this.playbackRate,
    }
    if(this[_parent]) {
      timeMark.globalEntropy = this[_parent].entropy
    }
    this[_timeMark].push(timeMark)
  }
  // Both currentTime and entropy should be influenced by playbackRate.
  // If current playbackRate is negative, the currentTime should go backwards
  // while the entropy remain to go forwards.
  // Both of the initial values is set to -originTime
  get entropy() {
    const {globalTime, entropy, globalEntropy} = this.lastTimeMark
    if(this[_parent]) {
      return entropy + Math.abs((this[_parent].entropy - globalEntropy) * this.playbackRate)
    }
    return entropy + Math.abs((this.globalTime - globalTime) * this.playbackRate)
  }
  get globalTime() {
    if(this[_parent]) {
      return this[_parent].currentTime
    }

    return nowtime()
  }
  // change entropy will NOT cause currentTime changing but may influence the pass
  // and the future of the timeline. (It may change the result of seek***Time)
  // While entropy is set, all the marks behind will be droped
  set entropy(entropy) {
    const idx = this.seekTimeMark(entropy)
    this[_timeMark].length = idx + 1
    const timeMark = {
      globalTime: this.globalTime,
      localTime: this.currentTime,
      entropy,
      playbackRate: this.playbackRate,
    }
    if(this[_parent]) {
      timeMark.globalEntropy = this[_parent].entropy
    }
    this[_timeMark].push(timeMark)
  }
  fork(options) {
    return new Timeline(options, this)
  }
  seekGlobalTime(seekEntropy) {
    const idx = this.seekTimeMark(seekEntropy),
      timeMark = this[_timeMark][idx]

    const {entropy, playbackRate, globalTime} = timeMark

    return globalTime + (seekEntropy - entropy) / Math.abs(playbackRate)
  }
  seekLocalTime(seekEntropy) {
    const idx = this.seekTimeMark(seekEntropy),
      timeMark = this[_timeMark][idx]

    const {localTime, entropy, playbackRate} = timeMark

    if(playbackRate > 0) {
      return localTime + (seekEntropy - entropy)
    }
    return localTime - (seekEntropy - entropy)
  }
  seekTimeMark(entropy) {
    const timeMark = this[_timeMark]

    let l = 0,
      r = timeMark.length - 1

    if(entropy <= timeMark[l].entropy) {
      return l
    }
    if(entropy >= timeMark[r].entropy) {
      return r
    }

    let m = Math.floor((l + r) / 2) // binary search

    while(m > l && m < r) {
      if(entropy === timeMark[m].entropy) {
        return m
      } else if(entropy < timeMark[m].entropy) {
        r = m
      } else if(entropy > timeMark[m].entropy) {
        l = m
      }
      m = Math.floor((l + r) / 2)
    }

    return l
  }
  get playbackRate() {
    return this[_playbackRate]
  }
  set playbackRate(rate) {
    if(rate !== this.playbackRate) {
      const currentTime = this.currentTime
      // force currentTime updating
      this.currentTime = currentTime
      this[_playbackRate] = rate
      // set new playbackRate in new time mark
      this.lastTimeMark.playbackRate = rate

      const timers = [...this[_timers]]
      timers.forEach(([id, timer]) => {
        this[_setTimer](timer.handler, timer.time, id)
      })

      this.updateAlarms()
    }
  }
  clearTimeout(id) {
    const timer = this[_timers].get(id)

    if(timer && timer.timerID != null) {
      if(this[_parent]) {
        this[_parent].clearTimeout(timer.timerID)
      } else {
        clearTimeout(timer.timerID)
      }
    }
    this[_timers].delete(id)
  }
  clearInterval(id) {
    return this.clearTimeout(id)
  }
  clear() {
    // clear all running timers & alarms
    const alarms = this[_alarms]
    ;[...alarms.keys()].forEach((id) => {
      this.clearAlarm(id)
    })
    const timers = this[_timers]
    ;[...timers.keys()].forEach((id) => {
      this.clearTimeout(id)
    })
  }
  /*
    setTimeout(func, {delay: 100, isEntropy: true})
    setTimeout(func, {entropy: 100})
    setTimeout(func, 100})
   */
  setTimeout(handler, time = {delay: 0}) {
    return this[_setTimer](handler, time)
  }
  setInterval(handler, time = {delay: 0}) {
    const that = this
    const id = this[_setTimer](function step() {
      // reset timer before handler cause we may clearTimeout in handler()
      that[_setTimer](step, time, id)
      handler()
    }, time)

    return id
  }
  updateAlarms() {
    const alarms = this[_alarms]
    ;[...alarms.entries()].forEach(([id, {time, handler}]) => {
      if(!this[_timers].has(id)) {
        this.setAlarm(time, handler, id)
      }
    })
  }
  setAlarm(time, handler, id = Symbol('alarm')) {
    if(this.playbackRate !== 0) {
      const delay = (time - this.currentTime) / this.playbackRate
      if(delay > 0) {
        this[_setTimer](handler, {delay, isEntropy: true}, id)
      }
    }
    this[_alarms].set(id, {time, handler})
    return id
  }
  clearAlarm(id) {
    if(this[_timers].has(id)) {
      this.clearTimeout(id)
    }
    this[_alarms].delete(id)
  }
  [_setTimer](handler, time, id = Symbol('timerID')) {
    time = formatDelay(time)

    const timer = this[_timers].get(id)
    let delay,
      timerID = null,
      startTime,
      startEntropy

    if(timer) {
      this.clearTimeout(id)
      if(time.isEntropy) {
        delay = (time.delay - (this.entropy - timer.startEntropy)) / Math.abs(this.playbackRate)
      } else if(this.playbackRate >= 0) {
        delay = (time.delay - (this.currentTime - timer.startTime)) / this.playbackRate
      } else {
        // playbackRate < 0, back to startPoint
        delay = (timer.startTime - this.currentTime) / this.playbackRate
      }
      startTime = timer.startTime
      startEntropy = timer.startEntropy
    } else {
      delay = time.delay / (time.isEntropy ? Math.abs(this.playbackRate) : this.playbackRate)
      startTime = this.currentTime
      startEntropy = this.entropy
    }

    // if playbackRate is zero, delay will be infinity.
    if(Number.isFinite(delay)) {
      delay = Math.ceil(delay)

      const parent = this[_parent],
        globalTimeout = parent ? parent.setTimeout.bind(parent) : setTimeout

      // if(parent) {
      //   delay = {delay, isEntropy: true}
      // }

      timerID = globalTimeout(() => {
        this[_timers].delete(id)
        handler()
      }, delay)
    }

    this[_timers].set(id, {
      timerID,
      handler,
      time,
      startTime,
      startEntropy,
    })

    return id
  }
}

module.exports = Timeline
