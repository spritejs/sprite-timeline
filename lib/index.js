'use strict';

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _isFinite = require('babel-runtime/core-js/number/is-finite');

var _isFinite2 = _interopRequireDefault(_isFinite);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _symbol = require('babel-runtime/core-js/symbol');

var _symbol2 = _interopRequireDefault(_symbol);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function nowtime() {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  } else if (typeof process !== 'undefined' && process.hrtime) {
    var _process$hrtime = process.hrtime(),
        _process$hrtime2 = (0, _slicedToArray3.default)(_process$hrtime, 2),
        s = _process$hrtime2[0],
        ns = _process$hrtime2[1];

    return s * 1e3 + ns * 1e-6;
  }
  return Date.now ? Date.now() : new Date().getTime();
}

var defaultOptions = {
  originTime: 0,
  playbackRate: 1.0
};

var _timeMark = (0, _symbol2.default)('timeMark'),
    _playbackRate = (0, _symbol2.default)('playbackRate'),
    _timers = (0, _symbol2.default)('timers'),
    _originTime = (0, _symbol2.default)('originTime'),
    _timerID = (0, _symbol2.default)('timerID'),
    _setTimer = (0, _symbol2.default)('setTimer'),
    _parent = (0, _symbol2.default)('parent');

var Timeline = function () {
  function Timeline(options, parent) {
    (0, _classCallCheck3.default)(this, Timeline);

    if (options instanceof Timeline) {
      parent = options;
      options = {};
    }

    options = (0, _assign2.default)({}, defaultOptions, options);

    if (parent) {
      this[_parent] = parent;
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
      playbackRate: options.playbackRate
    }];

    if (this[_parent]) {
      this[_timeMark][0].globalEntropy = this[_parent].entropy;
    }

    this[_originTime] = options.originTime;
    this[_playbackRate] = options.playbackRate;
    this[_timers] = new _map2.default();
    this[_timerID] = 0;
  }

  (0, _createClass3.default)(Timeline, [{
    key: 'fork',
    value: function fork(options) {
      return new Timeline(options, this);
    }
  }, {
    key: 'seekGlobalTime',
    value: function seekGlobalTime(seekEntropy) {
      var idx = this.seekTimeMark(seekEntropy),
          timeMark = this[_timeMark][idx];

      var entropy = timeMark.entropy,
          playbackRate = timeMark.playbackRate,
          globalTime = timeMark.globalTime;


      return globalTime + (seekEntropy - entropy) / Math.abs(playbackRate);
    }
  }, {
    key: 'seekLocalTime',
    value: function seekLocalTime(seekEntropy) {
      var idx = this.seekTimeMark(seekEntropy),
          timeMark = this[_timeMark][idx];

      var localTime = timeMark.localTime,
          entropy = timeMark.entropy,
          playbackRate = timeMark.playbackRate;


      if (playbackRate > 0) {
        return localTime + (seekEntropy - entropy);
      }
      return localTime - (seekEntropy - entropy);
    }
  }, {
    key: 'seekTimeMark',
    value: function seekTimeMark(entropy) {
      var timeMark = this[_timeMark];

      var l = 0,
          r = timeMark.length - 1;

      if (entropy <= timeMark[l].entropy) {
        return l;
      }
      if (entropy >= timeMark[r].entropy) {
        return r;
      }

      var m = Math.floor((l + r) / 2); // binary search

      while (m > l && m < r) {
        if (entropy === timeMark[m].entropy) {
          return m;
        } else if (entropy < timeMark[m].entropy) {
          r = m;
        } else if (entropy > timeMark[m].entropy) {
          l = m;
        }
        m = Math.floor((l + r) / 2);
      }

      return l;
    }
  }, {
    key: 'clearTimeout',
    value: function (_clearTimeout) {
      function clearTimeout(_x) {
        return _clearTimeout.apply(this, arguments);
      }

      clearTimeout.toString = function () {
        return _clearTimeout.toString();
      };

      return clearTimeout;
    }(function (id) {
      var timer = this[_timers].get(id);
      if (timer && timer.timerID != null) {
        if (this[_parent]) {
          this[_parent].clearTimeout(timer.timerID);
        } else {
          clearTimeout(timer.timerID);
        }
      }
      this[_timers].delete(id);
    })
  }, {
    key: 'clearInterval',
    value: function clearInterval(id) {
      return this.clearTimeout(id);
    }
  }, {
    key: 'setTimeout',
    value: function setTimeout(handler) {
      var time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { time: 0 };

      return this[_setTimer](handler, time, 'timeout');
    }
  }, {
    key: 'setInterval',
    value: function setInterval(handler) {
      var time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { time: 0 };

      return this[_setTimer](handler, time, 'interval');
    }
  }, {
    key: _setTimer,
    value: function value(handler, time) {
      var _this = this;

      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'timeout';

      if (typeof time === 'number') {
        time = { time: time };
      }

      var currentTime = this.currentTime,
          entropy = this.entropy;

      var id = ++this[_timerID];

      var timerID = null;
      var delay = void 0;

      if (time.time == null) {
        // entropy
        delay = time.entropy / Math.abs(this.playbackRate);
      } else {
        delay = time.time / this.playbackRate;
      }

      if ((0, _isFinite2.default)(delay)) {
        var parent = this[_parent],
            globalTimeout = parent ? parent.setTimeout.bind(parent) : setTimeout,
            globalInterval = parent ? parent.setInterval.bind(parent) : setInterval;

        delay = Math.ceil(delay);

        if (this[_parent]) {
          delay = { entropy: delay };
        }

        if (type === 'timeout') {
          timerID = globalTimeout(function () {
            _this[_timers].delete(id);
            handler();
          }, delay);
        } else if (type === 'interval') {
          timerID = globalInterval(function () {
            var timer = _this[_timers].get(id);
            timer.active = true;
            handler();
            timer.active = false;
          }, delay);
        }
      }

      this[_timers].set(id, {
        timerID: timerID,
        handler: handler,
        time: time,
        currentTime: currentTime,
        entropy: entropy,
        type: type
      });

      return id;
    }
  }, {
    key: 'currentTime',
    get: function get() {
      var _timeMark2 = this[_timeMark][this[_timeMark].length - 1],
          localTime = _timeMark2.localTime,
          globalTime = _timeMark2.globalTime;

      return localTime + (this.globalTime - globalTime) * this.playbackRate;
    },
    set: function set(time) {
      var timeMark = {
        globalTime: this.globalTime,
        localTime: time,
        entropy: this.entropy,
        playbackRate: this.playbackRate
      };

      if (this[_parent]) {
        timeMark.globalEntropy = this[_parent].entropy;
      }

      this[_timeMark].push(timeMark);
    }
    // Both currentTime and entropy should be influenced by playbackRate.
    // If current playbackRate is negative, the currentTime should go backwards
    // while the entropy remain to go forwards.
    // Both of the initial values is set to -originTime

  }, {
    key: 'entropy',
    get: function get() {
      var _timeMark3 = this[_timeMark][this[_timeMark].length - 1],
          globalTime = _timeMark3.globalTime,
          entropy = _timeMark3.entropy,
          globalEntropy = _timeMark3.globalEntropy;

      if (this[_parent]) {
        return entropy + Math.abs((this[_parent].entropy - globalEntropy) * this.playbackRate);
      }
      return entropy + Math.abs((this.globalTime - globalTime) * this.playbackRate);
    },

    // change entropy will NOT cause currentTime changing but may influence the pass
    // and the future of the timeline. (It may change the result of seek***Time)
    // While entropy is set, all the marks behind will be droped
    set: function set(entropy) {
      var idx = this.seekTimeMark(entropy);
      this[_timeMark].length = idx + 1;

      this[_timeMark].push({
        globalTime: this.globalTime,
        localTime: this.currentTime,
        entropy: entropy,
        playbackRate: this.playbackRate
      });
    }
  }, {
    key: 'globalTime',
    get: function get() {
      if (this[_parent]) {
        return this[_parent].currentTime;
      }

      return nowtime();
    }
  }, {
    key: 'playbackRate',
    get: function get() {
      return this[_playbackRate];
    },
    set: function set(rate) {
      var _this2 = this;

      if (rate !== this.playbackRate) {
        var currentTime = this.currentTime;
        // force currentTime updating
        this.currentTime = currentTime;
        this[_playbackRate] = rate;
        // set new playbackRate in new time mark
        this[_timeMark][this[_timeMark].length - 1].playbackRate = rate;

        // This should be asynchronous because we may reset playbackRate
        // in the timer handler ?
        if (this[_timers].size) {
          var timers = [].concat((0, _toConsumableArray3.default)(this[_timers]));
          timers.forEach(function (_ref) {
            var _ref2 = (0, _slicedToArray3.default)(_ref, 2),
                id = _ref2[0],
                timer = _ref2[1];

            _this2.clearTimeout(id);

            var entropy = _this2.entropy,
                time = timer.time,
                handler = timer.handler,
                type = timer.type,
                active = timer.active;


            var timerID = null;

            var delay = void 0;
            if (time.time == null) {
              delay = time.entropy - (entropy - timer.entropy);
              delay /= Math.abs(_this2.playbackRate);
            } else {
              delay = time.time - (currentTime - timer.currentTime);
              delay /= _this2.playbackRate;
            }

            if ((0, _isFinite2.default)(delay)) {
              var parent = _this2[_parent],
                  globalTimeout = parent ? parent.setTimeout.bind(parent) : setTimeout,
                  globalInterval = parent ? parent.setInterval.bind(parent) : setInterval;

              delay = Math.ceil(delay);

              if (_this2[_parent]) {
                delay = { entropy: delay };
              }

              if (type === 'timeout') {
                timerID = globalTimeout(function () {
                  _this2[_timers].delete(id);
                  handler();
                }, delay);
              } else if (type === 'interval') {
                timerID = globalTimeout(function () {
                  if (!active) {
                    handler();
                  }
                  if (time.time == null) {
                    delay = time.entropy / Math.abs(_this2.playbackRate);
                  } else {
                    delay = time.time / _this2.playbackRate;
                  }
                  if (_this2[_timers].has(id)) {
                    timerID = globalInterval(function () {
                      handler();
                    }, delay);
                    _this2[_timers].get(id).timerID = timerID;
                  }
                }, delay);
              }
            }

            _this2[_timers].set(id, {
              timerID: timerID,
              handler: handler,
              time: time,
              currentTime: currentTime,
              entropy: entropy,
              type: type
            });
          });
        }
      }
    }
  }]);
  return Timeline;
}();

module.exports = Timeline;