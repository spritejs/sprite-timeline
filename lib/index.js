function nowtime() {
  if(typeof performance !== 'undefined' && performance.now) {
    return performance.now()
  } else if(typeof process !== 'undefined' && process.hrtime) {
    let [s, ns] = process.hrtime()
    return s * 1e3 + ns * 1e-6
  }
  return Date.now ? Date.now() : (new Date()).getTime()
}

const defaultOptions = {
  originTime: 0,
  playbackRate: 1.0
}

const _timeMark = Symbol('timeMark'),
  _playbackRate = Symbol('playbackRate'),
  _timers = Symbol('timers'),
  _originTime = Symbol('originTime'),
  _timerID = Symbol('timerID'),
  _setTimer = Symbol('setTimer'),
  _parent = Symbol('parent')

class Timeline {
  constructor(options, parent) {
    if(options instanceof Timeline){
      parent = options
      options = {}
    }

    options = Object.assign({}, defaultOptions, options)
    
    if(parent){
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
    }]

    if(this[_parent]){
      this[_timeMark][0].globalEntropy = this[_parent].entropy
    }

    this[_originTime] = options.originTime
    this[_playbackRate] = options.playbackRate
    this[_timers] = new Map()
    this[_timerID] = 0
  }
  get currentTime() {
    const {localTime, globalTime} = this[_timeMark][this[_timeMark].length - 1]
    return localTime + (this.globalTime - globalTime) * this.playbackRate
  }
  set currentTime(time) {
    const timeMark = {
      globalTime: this.globalTime,
      localTime: time,
      entropy: this.entropy,
      playbackRate: this.playbackRate,
    }

    if(this[_parent]){
      timeMark.globalEntropy = this[_parent].entropy
    }

    this[_timeMark].push(timeMark)
  }
  // Both currentTime and entropy should be influenced by playbackRate.
  // If current playbackRate is negative, the currentTime should go backwards
  // while the entropy remain to go forwards.
  // Both of the initial values is set to -originTime
  get entropy() {
    const {globalTime, entropy, globalEntropy} = this[_timeMark][this[_timeMark].length - 1]
    if(this[_parent]){
      return entropy + Math.abs((this[_parent].entropy - globalEntropy) * this.playbackRate)
    }
    return entropy + Math.abs((this.globalTime - globalTime) * this.playbackRate)
  }
  get globalTime() {
    if(this[_parent]){
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

    this[_timeMark].push({
      globalTime: this.globalTime,
      localTime: this.currentTime,
      entropy,
      playbackRate: this.playbackRate,
    })
  }
  fork(options){
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
      this[_timeMark][this[_timeMark].length - 1].playbackRate = rate

      // This should be asynchronous because we may reset playbackRate
      // in the timer handler ?
      if(this[_timers].size) {
        let timers = [...this[_timers]]
        timers.forEach(([id, timer]) => {
          this.clearTimeout(id)

          const entropy = this.entropy,
            {time, handler, type, active} = timer
          
          let timerID = null

          let delay
          if(time.time == null) {
            delay = time.entropy - (entropy - timer.entropy)
            delay /= Math.abs(this.playbackRate)
          } else {
            delay = time.time - (currentTime - timer.currentTime)
            delay /= this.playbackRate
          }

          if(isFinite(delay)) {
            const parent = this[_parent],
              globalTimeout = parent ? parent.setTimeout.bind(parent) : setTimeout,
              globalInterval = parent ? parent.setInterval.bind(parent) : setInterval

            delay = Math.ceil(delay)
            
            if(this[_parent]){
              delay = {entropy: delay}
            }

            if(type === 'timeout') {
              timerID = globalTimeout(() => {
                this[_timers].delete(id)
                handler()
              }, delay)
            } else if(type === 'interval') {
              timerID = globalTimeout(() => {
                if(!active) {
                  handler()
                }
                if(time.time == null) {
                  delay = time.entropy / Math.abs(this.playbackRate)
                } else {
                  delay = time.time / this.playbackRate
                }
                if(this[_timers].has(id)){
                  timerID = globalInterval(() => {
                    handler()
                  }, delay)
                  this[_timers].get(id).timerID = timerID
                }
              }, delay)
            }
          }

          this[_timers].set(id, {
            timerID,
            handler,
            time,
            currentTime,
            entropy,
            type
          })
        })
      }
    }
  }
  clearTimeout(id) {
    const timer = this[_timers].get(id)
    if(timer && timer.timerID != null) {
      if(this[_parent]){
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
  setTimeout(handler, time = {time: 0}) {
    return this[_setTimer](handler, time, 'timeout')
  }
  setInterval(handler, time = {time: 0}) {
    return this[_setTimer](handler, time, 'interval')
  }
  [_setTimer](handler, time, type = 'timeout') {
    if(typeof time === 'number') {
      time = {time}
    }

    const currentTime = this.currentTime,
      entropy = this.entropy

    const id = ++this[_timerID]

    let timerID = null
    let delay

    if(time.time == null) { // entropy
      delay = time.entropy / Math.abs(this.playbackRate)
    } else {
      delay = time.time / this.playbackRate
    }

    if(isFinite(delay)) {
      const parent = this[_parent],
        globalTimeout = parent ? parent.setTimeout.bind(parent) : setTimeout,
        globalInterval = parent ? parent.setInterval.bind(parent) : setInterval

      delay = Math.ceil(delay)

      if(this[_parent]){
        delay = {entropy: delay}
      }

      if(type === 'timeout') {
        timerID = globalTimeout(() => {
          this[_timers].delete(id)
          handler()
        }, delay)
      } else if(type === 'interval') {
        timerID = globalInterval(() => {
          const timer = this[_timers].get(id)
          timer.active = true
          handler()
          timer.active = false
        }, delay)
      }
    }

    this[_timers].set(id, {
      timerID,
      handler,
      time,
      currentTime,
      entropy,
      type,
    })

    return id
  }
}

module.exports = Timeline
