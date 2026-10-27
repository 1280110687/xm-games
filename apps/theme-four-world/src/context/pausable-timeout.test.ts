import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPausableTimeout } from './pausable-timeout';

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
});
afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('museum hint and message lifetime', () => {
    it('preserves the remaining paid hint and message time through a long menu visit', () => {
        const hint = createPausableTimeout();
        const message = createPausableTimeout();
        const hideHint = vi.fn();
        const hideMessage = vi.fn();
        hint.start(hideHint, 6000);
        message.start(hideMessage, 5600);
        vi.advanceTimersByTime(2000);
        hint.setPaused(true);
        message.setPaused(true);
        vi.advanceTimersByTime(20_000);
        expect(hideHint).not.toHaveBeenCalled();
        expect(hideMessage).not.toHaveBeenCalled();
        hint.setPaused(false);
        message.setPaused(false);
        vi.advanceTimersByTime(3599);
        expect(hideMessage).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(hideMessage).toHaveBeenCalledOnce();
        expect(hideHint).not.toHaveBeenCalled();
        vi.advanceTimersByTime(400);
        expect(hideHint).toHaveBeenCalledOnce();
    });

    it('does not grant extra lifetime when repeatedly opening the menu and directory', () => {
        const timer = createPausableTimeout();
        const expire = vi.fn();
        timer.start(expire, 6000);
        vi.advanceTimersByTime(1000);
        timer.setPaused(true);
        vi.advanceTimersByTime(4000);
        timer.setPaused(true);
        vi.advanceTimersByTime(4000);
        timer.setPaused(false);
        vi.advanceTimersByTime(2000);
        timer.setPaused(true);
        vi.advanceTimersByTime(5000);
        timer.setPaused(false);
        timer.setPaused(false);
        vi.advanceTimersByTime(2999);
        expect(expire).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(expire).toHaveBeenCalledOnce();
    });

    it('starts a message created while paused only after the host resumes', () => {
        const timer = createPausableTimeout();
        const expire = vi.fn();
        timer.setPaused(true);
        timer.start(expire, 3200);
        vi.advanceTimersByTime(10_000);
        expect(expire).not.toHaveBeenCalled();
        timer.setPaused(false);
        vi.advanceTimersByTime(3199);
        expect(expire).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(expire).toHaveBeenCalledOnce();
    });

    it('clears old callbacks when a run restarts during a pause', () => {
        const timer = createPausableTimeout();
        const previousRun = vi.fn();
        const nextRun = vi.fn();
        timer.start(previousRun, 6000);
        vi.advanceTimersByTime(2000);
        timer.setPaused(true);
        timer.clear();
        timer.start(nextRun, 3200);
        timer.setPaused(false);
        vi.advanceTimersByTime(6000);
        expect(previousRun).not.toHaveBeenCalled();
        expect(nextRun).toHaveBeenCalledOnce();
    });

    it.each([false, true])('cancels all pending work on cleanup while paused=%s', paused => {
        const timer = createPausableTimeout();
        const expire = vi.fn();
        timer.start(expire, 6000);
        vi.advanceTimersByTime(1000);
        timer.setPaused(paused);
        timer.clear();
        timer.setPaused(false);
        vi.advanceTimersByTime(20_000);
        expect(expire).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });
});
