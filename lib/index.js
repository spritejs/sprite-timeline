function nowtime(){
  if(typeof performance !== 'undefined' && performance.now){
    return performance.now();
  }
  return Date.now ? Date.now() : (new Date()).getTime();
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
      _setTimer = Symbol('setTimer')

class Timeline {
  constructor(options){
    options = Object.assign({}, defaultOptions, options)

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

    this[_originTime] = options.originTime
    this[_playbackRate] = options.playbackRate
    this[_timers] = new Map()
    this[_timerID] = 0
  }
  get currentTime(){
    const {localTime, globalTime} = this[_timeMark][this[_timeMark].length - 1]
    return localTime + (this.globalTime - globalTime) * this.playbackRate
  }
  set currentTime(time){
    this[_timeMark].push({
      globalTime: this.globalTime,
      localTime: time,
      entropy: this.entropy,
      playbackRate: this.playbackRate,
    })
  }
  // Both currentTime and entropy should be influenced by playbackRate.
  // If current playbackRate is negative, the currentTime should go backwards
  // while the entropy remain to go forwards.
  // Both of the initial values is set to -originTime
  get entropy(){
    const {globalTime, entropy} = this[_timeMark][this[_timeMark].length - 1]
    return entropy + Math.abs((this.globalTime - globalTime) * this.playbackRate)
  }
  get globalTime(){
    return nowtime()
  }
  // 设置 durtion，不会改变 currentTime
  // 当前设置的 entropy 之后的所有的 mark 都被丢弃
  set entropy(entropy){
    const idx = this.seekTimeMark(entropy)
    this[_timeMark].length = idx + 1
    this[_timeMark].push({
      globalTime: this.globalTime,
      localTime: this.currentTime,
      entropy: entropy,
      playbackRate: this.playbackRate,
    })
  }
  seekGlobalTime(entropy){
    const idx = this.seekTimeMark(entropy),
          timeMark = this[_timeMark][idx]

    const {localTime, previousEntropy, playbackRate, globalTime} = timeMark

    return globalTime + (entropy - previousEntropy) / Math.abs(playbackRate)  
  }
  seekLocalTime(entropy){
    const idx = this.seekTimeMark(entropy),
          timeMark = this[_timeMark][idx]

    const {localTime, previousEntropy, playbackRate} = timeMark

    if(playbackRate > 0){
      return localTime + (entropy - previousEntropy)    
    } else {
      return localTime - (entropy - previousEntropy)
    }
  }
  seekTimeMark(entropy){
    const timeMark = this[_timeMark]

    let l = 0, r = timeMark.length - 1

    if(entropy <= timeMark[l].entropy){
      //如果在第一个 timeMark 之前，只能依据第一个 timeMark
      return  l
    }
    if(entropy >= timeMark[r].entropy){
      //如果在最后一个 timeMark 之后，则依据最后一个 timeMark
      return r
    }

    let m = Math.floor((l + r) / 2) //二分查找

    while(m > l && m < r){
      if(entropy == timeMark[m].entropy){
        return m
      } else if(entropy < timeMark[m].entropy){
        r = m
      } else if(entropy > timeMark[m].entropy){
        l = m
      }
      m = Math.floor((l + r) / 2)
    }

    return l
  }
  get playbackRate(){
    return this[_playbackRate]
  }
  set playbackRate(rate){
    if(rate !== this.playbackRate){
      const currentTime = this.currentTime
      //reset 让 timeMark 更新
      this.currentTime = currentTime
      this[_playbackRate] = rate
      this[_timeMark][this[_timeMark].length - 1].playbackRate = rate

      // This should be asynchronous because we may reset playbackRate
      // in the timer handler ?
      if(this[_timers].size){
        for(let [id, timer] of this[_timers].entries()){
          this.clearTimeout(id)

          const entropy = this.entropy,
                {time, handler, type, active} = timer

          let delay
          if(time.time == null){
            delay = time.entropy - (entropy - timer.entropy)
            delay /= Math.abs(this.playbackRate)
          } else {
            delay = time.time - (currentTime - timer.currentTime)
            delay /= this.playbackRate
          }

          let timerID = null

          if(isFinite(delay)){
            if(type === 'timeout'){
              timerID = setTimeout(() => {
                this[_timers].delete(id)
                handler()
              }, delay)
            } else if(type === 'interval'){
              timerID = setTimeout(() => {
                if(!active){
                  handler()
                }
                if(time.time == null){
                  delay = time.entropy / Math.abs(this.playbackRate)
                } else {
                  delay = time.time / this.playbackRate
                }
                timerID = setInterval(() => {
                  handler()
                }, delay)
                this[_timers].get(id).timerID = timerID
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
        }
      }
    }
  }
  clearTimeout(id){
    const timer = this[_timers].get(id)
    if(timer && timer.timerID != null){
      clearTimeout(timer.timerID)
    }
  }
  clearInterval(id){
    return this.clearTimeout(id)
  }
  setTimeout(handler, time = {time: 0}){
    return this[_setTimer](handler, time, 'timeout')
  }
  setInterval(handler, time = {time: 0}){
    return this[_setTimer](handler, time, 'interval')
  }
  [_setTimer](handler, time, type = 'timeout'){
    if(typeof time === 'number'){
      time = {time: time}
    }

    const currentTime = this.currentTime,
          playbackRate = this.playbackRate,
          entropy = this.entropy

    const id = ++this[_timerID]

    let timerID = null
    let delay
    
    if(time.time == null) { //entropy
      delay = time.entropy / Math.abs(this.playbackRate)
    } else {
      delay = time.time / this.playbackRate
    }

    if(isFinite(delay)){
      if(type === 'timeout'){
        timerID = setTimeout(() => {
          this[_timers].delete(id)
          handler()
        }, delay)
      } else if(type === 'interval'){
        timerID = setInterval(() => {
          this[_timers].get(id).active = true
          handler()
          this[_timers].get(id).active = false
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
