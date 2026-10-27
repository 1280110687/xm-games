// Menu time must not count toward the museum's elapsed time or final score.
export function createHuntClock(now = Date.now) {
    let startedAt = 0;
    let pausedAt = null;
    let pausedDuration = 0;

    return {
        start(paused = false) {
            startedAt = now();
            pausedAt = paused ? startedAt : null;
            pausedDuration = 0;
        },
        setPaused(paused) {
            if (paused && pausedAt === null) pausedAt = now();
            else if (!paused && pausedAt !== null) {
                pausedDuration += Math.max(0, now() - pausedAt);
                pausedAt = null;
            }
        },
        elapsed() {
            return Math.max(0, (pausedAt ?? now()) - startedAt - pausedDuration);
        },
    };
}
