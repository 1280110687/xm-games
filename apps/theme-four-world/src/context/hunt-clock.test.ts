import { describe, expect, it } from 'vitest';
import { createHuntClock } from './hunt-clock';

describe('museum elapsed time around clubhouse menus', () => {
    it('freezes during a menu and excludes that time from a completed run', () => {
        let now = 1000;
        const clock = createHuntClock(() => now);
        clock.start();
        now += 1500;
        clock.setPaused(true);
        now += 20_000;
        expect(clock.elapsed()).toBe(1500);
        clock.setPaused(false);
        now += 2500;
        expect(clock.elapsed()).toBe(4000);
    });

    it('does not restart the pause boundary when duplicate host messages arrive', () => {
        let now = 1000;
        const clock = createHuntClock(() => now);
        clock.start();
        now += 900;
        clock.setPaused(true);
        now += 4000;
        clock.setPaused(true);
        now += 6000;
        clock.setPaused(false);
        clock.setPaused(false);
        expect(clock.elapsed()).toBe(900);
        now += 100;
        expect(clock.elapsed()).toBe(1000);
    });

    it('accounts for consecutive menu and directory visits', () => {
        let now = 1000;
        const clock = createHuntClock(() => now);
        clock.start();
        now += 1000;
        clock.setPaused(true);
        now += 2000;
        clock.setPaused(false);
        now += 500;
        clock.setPaused(true);
        now += 3000;
        clock.setPaused(false);
        now += 500;
        expect(clock.elapsed()).toBe(2000);
    });

    it('keeps a new room run frozen when its host menu is already open', () => {
        let now = 1000;
        const clock = createHuntClock(() => now);
        clock.start(true);
        now += 10_000;
        expect(clock.elapsed()).toBe(0);
        clock.setPaused(false);
        now += 700;
        expect(clock.elapsed()).toBe(700);
    });

    it('clears elapsed time and previous pauses when restarting the museum', () => {
        let now = 1000;
        const clock = createHuntClock(() => now);
        clock.start();
        now += 500;
        clock.setPaused(true);
        now += 2000;
        clock.start(true);
        now += 3000;
        clock.setPaused(false);
        expect(clock.elapsed()).toBe(0);
        now += 250;
        expect(clock.elapsed()).toBe(250);
    });
});
