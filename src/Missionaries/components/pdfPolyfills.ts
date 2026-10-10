// pdf.js 5 calls Promise.withResolvers, which only exists in Chrome 119+, Safari/iOS 17.4+ and
// Firefox 121+. Older kiosks and phones failed to open prayer letters without any message.
// Imported before react-pdf. If pdf.js still can't open a letter (e.g. the worker on a very old
// browser), PrayerLetterDialog falls back to the browser's built-in PDF viewer.
type WithResolvers = <T>() => { promise: Promise<T>; resolve: (v: T | PromiseLike<T>) => void; reject: (e?: unknown) => void };

const P = Promise as unknown as { withResolvers?: WithResolvers };
if (typeof P.withResolvers !== 'function') {
  P.withResolvers = <T,>() => {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (e?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
