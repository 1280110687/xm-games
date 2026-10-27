export function createPausableTimeout(now = Date.now) {
    let timer = null;
    let callback = null;
    let remaining = 0;
    let deadline = 0;
    let paused = false;

    const cancelTimer = () => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
    };
    const schedule = () => {
        if (paused || callback === null) return;
        deadline = now() + remaining;
        timer = setTimeout(() => {
            timer = null;
            const expire = callback;
            callback = null;
            remaining = 0;
            expire();
        }, remaining);
    };

    return {
        start(expire, duration) {
            cancelTimer();
            callback = expire;
            remaining = Math.max(0, duration);
            schedule();
        },
        clear() {
            cancelTimer();
            callback = null;
            remaining = 0;
        },
        setPaused(next) {
            if (paused === next) return;
            paused = next;
            if (paused) {
                if (timer !== null) remaining = Math.max(0, deadline - now());
                cancelTimer();
            } else schedule();
        },
    };
}
