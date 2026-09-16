import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampPose, CORRIDOR_POSE, ENTRANCE_POSE, ROOM_POSES, initialDoors, pushProgress, readSnapshot, saveSnapshot } from './model';

afterEach(() => vi.unstubAllGlobals());

describe('clubhouse movement and persistence', () => {
    it('starts with closed entrance leaves, including after a refresh', () => {
        expect(initialDoors('entrance')).toEqual({ entrance: 0 });
        expect(initialDoors('contact')).toEqual({ entrance: 1, contact: 1 });
    });

    it('requires an upward push and caps its progress', () => {
        expect(pushProgress(500, 520, 844)).toBe(0);
        expect(pushProgress(500, 490, 844)).toBeLessThan(0.35);
        expect(pushProgress(500, 430, 844)).toBeGreaterThan(0.35);
        expect(pushProgress(500, 100, 844)).toBe(1);
    });

    it('keeps walking inside the corridor and looking inside a clear room aisle', () => {
        expect(clampPose({ ...CORRIDOR_POSE, x: 99, z: -99, pitch: 9, yaw: 10 }, 'corridor'))
            .toMatchObject({ x: 1.9, z: -9.2, pitch: 0.65 });
        const room = clampPose({ ...ROOM_POSES.contact, x: 99, z: 99, yaw: Math.PI * 2 + 0.7 }, 'contact');
        expect(room).toMatchObject({ x: ROOM_POSES.contact.x, z: ROOM_POSES.contact.z });
        expect(room.yaw).toBeCloseTo(0.7);
    });

    it('restores room orientation and the previous corridor location', () => {
        const storage = new Map<string, string>();
        vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) });
        const saved = { version: 1, place: 'contact', pose: { ...ROOM_POSES.contact, yaw: 1.2 }, returnPose: { ...CORRIDOR_POSE, z: -4 } };
        saveSnapshot(saved);
        const restored = readSnapshot();
        expect(restored).toMatchObject({ version: 1, place: 'contact', returnPose: saved.returnPose });
        expect(restored.pose.yaw).toBeCloseTo(saved.pose.yaw);
        expect(restored.pose.z).toBe(saved.pose.z);
    });

    it('recovers safely from malformed or unavailable session storage', () => {
        vi.stubGlobal('sessionStorage', { getItem: () => '{ broken', setItem: () => { throw new Error('Unavailable'); } });
        expect(readSnapshot()).toMatchObject({ place: 'entrance', pose: ENTRANCE_POSE });
        expect(() => saveSnapshot({ version: 1 })).not.toThrow();
    });
});
