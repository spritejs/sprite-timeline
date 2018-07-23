# Sprite Timeline

[![npm status](https://img.shields.io/npm/v/sprite-timeline.svg)](https://www.npmjs.org/package/sprite-timeline)
[![build status](https://api.travis-ci.org/spritejs/sprite-timeline.svg?branch=master)](https://travis-ci.org/spritejs/sprite-timeline) 
[![dependency status](https://david-dm.org/spritejs/sprite-timeline.svg)](https://david-dm.org/spritejs/sprite-timeline)
[![Maintainability](https://api.codeclimate.com/v1/badges/7882da6c1cbac6283ffd/maintainability)](https://codeclimate.com/github/spritejs/sprite-timeline/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/7882da6c1cbac6283ffd/test_coverage)](https://codeclimate.com/github/spritejs/sprite-timeline/test_coverage)

Custom timelines  for manipulate sprite animation.

## Installation

```bash
npm install sprite-timeline
```

## Usage

in browser

```html
<script src="https://s2.ssl.qhres.com/!9796048a/sprite-timeline.min.js"></script>
```

## Demos

[DEMO 1](https://code.h5jun.com/mit/edit?js,output)

```js
const T = 2000
let timeline

requestAnimationFrame(function update() {
  if(!timeline) timeline = new Timeline()
  const rotation = 360 * timeline.currentTime / T
  ball.style.transform = `rotate(${rotation}deg)`
  requestAnimationFrame(update)
})

speedUp.onclick = function(){
  if(timeline) timeline.playbackRate += 0.2
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}

speedDown.onclick = function(){
  if(timeline) timeline.playbackRate -= 0.2
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}

reverse.onclick = function(){
  if(timeline) timeline.playbackRate = -timeline.playbackRate
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}

pause.onclick = function(){
  if(timeline) timeline.playbackRate = 0
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}
```

[DEMO 2](https://code.h5jun.com/qosi/edit?js,output)

```js
const T = 2000
let timeline = new Timeline()

timeline.setInterval(function update() {
  ball.innerHTML = Math.round(timeline.currentTime / 100)
  if(timeline.playbackRate < 0){
    ball.style.backgroundColor = 'green'
  } else {
    ball.style.backgroundColor = 'red'
  }
}, {entropy: 100})

speedUp.onclick = function(){
  if(timeline) timeline.playbackRate += 0.2
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}

speedDown.onclick = function(){
  if(timeline) timeline.playbackRate -= 0.2
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}

reverse.onclick = function(){
  if(timeline) timeline.playbackRate = -timeline.playbackRate
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}

pause.onclick = function(){
  if(timeline) timeline.playbackRate = 0
  rate.innerHTML = timeline.playbackRate.toFixed(1)
}
```

## API

* [constructor({originTime = 0, playbackRate = 1.0})](#constructor)

##### Properties

* [currentTime](#currenttime)
* [entropy](#entropy)
* [playbackRate](#playbackRate)
* **readonly** [globalTime](#globaltime)

##### Methods

* [setTimeout(func, delay)](#settimeout)
* [setInterval(func, delay)](#setinterval)
* [clearTimeout(id)](#cleartimeout)
* [clearInterval(id)](#clearinterval)
* [fork(options)](#fork)
* [seekLocalTime(entropy)](#seeklocaltime)
* [seekGlobalTime(entropy)](#seekglobaltime)

### constructor

**new Timeline({originTime, playbackRate})**

Create a new timeline. If the **originTime** is set, currentTime is -originTime (see. [currentTime](#currentTime)) and entropy is -originTime (see. [entropy](#entropy)).

If the **playbackRate** is set to 1.0(by default), the time-lapse rate is normal. And if the playbackRate is set to 2.0, the time-laspe rate should be double. And if the playbackRate is set to -1.0, the time-laspe go backwards.

### properties

#### currentTime

Get or set the currentTime of the timeline according to the lastest playbackRate(see. [playbackRate](#playbackRate)).

```js
const timeline = new Timeline({originTime: 500})

let i = 0
const timerID = setInterval(() => {
  console.log(Math.round(timeline.currentTime / 100))
  if(++i >= 10){
    clearInterval(timerID)
  }
}, 100)

//output: -4,-3,-2,-1,0,1,2,3,4,5
```

#### entropy

Both currentTime and entropy should be influenced by playbackRate. If current playbackRate is negative, the currentTime should go backwards while the entropy remain to go forwards. Both currentTime and entropy's initial values should be -originTime.

```js
const timeline = new Timeline({originTime: 500})

let i = 0
const timerID = setInterval(() => {
  console.log([Math.round(timeline.currentTime / 100), Math.round(timeline.entropy / 100)])
  if(++i >= 10){
    clearInterval(timerID)
  }
}, 100)

setTimeout(() => {
  timeline.playbackRate = -timeline.playbackRate
}, 500)

//output: -4,-4,-3,-3,-2,-2,-1,-1,0,0,-1,1,-2,2,-3,3,-4,4,-5,5
```

#### playbackRate

Speed up or slow down the time-lapse. If playbackRate set to negative the time go backwards.

```js
const timeline = new Timeline({playbackRate: -2})

const startTime = timeline.globalTime

timeline.setTimeout(() => {
  console.log(timeline.currentTime, timeline.globalTime - startTime)
}, -2000)

//output: -2000, 1000
```

#### globalTime

**readonly** 

Return performance.now() or fallback to Date.now() if no performance API.

### methods

#### setTimeout

Create a timer according to timeline.playbackRate.

```js
const timeline = new Timeline({playbackRate: 2})

const startTime = timeline.globalTime

timeline.setTimeout(() => {
  console.log(timeline.currentTime, timeline.globalTime - startTime)
}, 1000)

//output: 1000, 500
```

**Note**: If you change the playbackRate before timeout, the timer will be adjust to the new playbackRate. 

```js
const timeline = new Timeline({playbackRate: 1})

const startTime = timeline.globalTime

timeline.setTimeout(() => {
  console.log(timeline.currentTime, timeline.globalTime - startTime)
}, 1000)

setTimeout(() => {
  timeline.playbackRate = 2
}, 200)

//output: 1000, 600
```

**set entropy timer**

You can set timers by entropy.

```js
const timeline = new Timeline({playbackRate: 1})

const startTime = timeline.globalTime

timeline.setTimeout(() => {
  console.log(timeline.currentTime, timeline.globalTime - startTime)
}, 1000)

timeline.setTimeout(() => {
  console.log(timeline.currentTime, timeline.globalTime - startTime)
}, {entropy: 1000})

setTimeout(() => {
  timeline.playbackRate = -2
}, 200)

//output: 200, 200
//output: -600, 600
```

#### setInterval

Similar with setTimeout.

#### clearTimeout

Clear the timer according to the corresponding timerID.

```js
const timeline = new Timeline({playbackRate: 1})

let i = 0
const timerID = timeline.setInterval(function(){
  console.log(++i)
  if(!(i % 10)){
    timeline.playbackRate ++
  }
  if(!(i % 100)){
    timeline.clearTimeout(timerID)
  }
}, 1000)
```

#### clearInterval

The  same as clearTimeout

#### fork

Fork a new timeline based on current timeline.

```js
const baseTimeline = new Timeline()

const timeline1 = baseTimeline.fork(),
      timeline2 = baseTimeline.fork({playbackRate: 2})

...

baseTimeline.playbackRate = 2 // Should speed up all forked timelines.
```

#### seekLocalTime

Seek localTime by entropy.

#### seekGlobalTime

Seek globalTime by entropy.

## License

MIT