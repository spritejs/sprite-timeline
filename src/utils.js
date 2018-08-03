export function nowtime() {
  if(typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  } if(typeof process !== 'undefined' && process.hrtime) {
    const [s, ns] = process.hrtime();
    return s * 1e3 + ns * 1e-6;
  }
  return Date.now ? Date.now() : (new Date()).getTime();
}

/*
  delay = 100 -> delay = {delay: 100}
  delay = {entropy: 100} -> delay = {delay: 100, isEntropy: true}
 */
export function formatDelay(delay) {
  if(typeof delay === 'number') {
    delay = {delay};
  } else if('entropy' in delay) {
    delay = {delay: delay.entropy, isEntropy: true};
  }
  return delay;
}
