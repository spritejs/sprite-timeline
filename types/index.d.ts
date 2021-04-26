interface TimelineOptions {
    originTime?: number;
    playbackRate?: number;
    nowtime?: () => number;
}

interface TimeMark {
    globalTime: number;
    localTime: number;
    entropy: number;
    playbackRate: number;
    globalEntropy: number;
}

interface TimeMarkOption {
    time?: number;
    entropy?: number;
    playbackRate?: number;
}

type CallbackFunction = () => {};

interface TimerOptions {
    delay: number;
    heading?: boolean;
    isEntropy?: boolean;
}

interface TimerRecord {
    timerID: Symbol;
    handler: CallbackFunction;
    time: TimerOptions;
    startTime: number;
    startEntropy: number;
}

declare class Timeline {
    constructor(options?: TimelineOptions | Timeline, parent?: Timeline): Timeline;

    get parent(): Timeline;

    get lastTimeMark(): TimeMark;

    markTime(timeMarkOption?: TimeMarkOption): void;

    get currentTime(): number;

    set currentTime(time: number): void;

    get entropy(): number;

    set entropy(entropy: number): void;

    get globalEntropy(): number;

    fork(options: TimelineOptions): Timeline;

    seekGlobalTime(seekEntropy: number): number;

    seekLocalTime(seekEntropy: number): number;

    seekTimeMark(entropy: number): number;

    get playbackRate(): number;

    set playbackRate(number): void;

    get paused(): boolean;

    updateTimers(): void;

    clearTimeout(id: Symbol): void;

    clearInterval(id: Symbol): void;

    clear(): void;

    setTimeout(handler: CallbackFunction, time?: TimerOptions): void;

    setInterval(handler: CallbackFunction, time?: TimerOptions): void;
}

export default Timeline;