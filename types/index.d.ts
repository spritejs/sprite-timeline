interface TimelineOptions {
    originTime?: number;
    playbackRate?: number;
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
    private _timeMark: TimeMark[];
    private _playbackRate: number;
    private _timers: Map<Symbol, TimerRecord>;
    private _originTime: number;
    private _parent: Timeline;

    constructor(options?: TimelineOptions | Timeline, parent?: Timeline);

    get parent(): Timeline;

    get lastTimeMark(): TimeMark;

    markTime(timeMarkOption?: TimeMarkOption): void;

    get currentTime(): number;

    set currentTime(time: number);

    get entropy(): number;

    set entropy(entropy: number);

    get globalEntropy(): number;

    fork(options: TimelineOptions): Timeline;

    seekGlobalTime(seekEntropy: number): number;

    seekLocalTime(seekEntropy: number): number;

    seekTimeMark(entropy: number): number;

    get playbackRate(): number;

    set playbackRate(number);

    get paused(): boolean;

    updateTimers(): void;

    clearTimeout(id: Symbol): void;

    clearInterval(id: Symbol): void;

    clear(): void;

    setTimeout(handler: CallbackFunction, time?: TimerOptions): void;

    setInterval(handler: CallbackFunction, time?: TimerOptions): void;
}

export default Timeline;