import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EXPERIENCE_MESSAGES } from '@xm-games/experience-bridge';
import { clampPose, CORRIDOR_POSE, ENTRANCE_POSE, ROOM_DOORS, ROOM_POSES, initialDoors, pushProgress, saveSnapshot } from './model';

const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const angleTarget = (from, to) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** Camera input is ref-driven. React only updates when a room changes. */
export default function Controller({ initial, apiRef, onPlace, onReady, onActivity, paused }) {
    const { camera, gl, invalidate } = useThree();
    const callbacks = useRef({ onPlace, onReady, onActivity });
    callbacks.current = { onPlace, onReady, onActivity };
    const state = useRef({
        place: initial.place, pose: { ...initial.pose }, target: { ...initial.pose },
        returnPose: { ...initial.returnPose }, tween: null, queue: [], finish: null,
        doors: initialDoors(initial.place),
        push: null, pointer: null, moved: false, ready: false, paused: false,
        lastSave: 0, keys: new Set(),
    });
    state.current.paused = paused;
    useEffect(() => {
        if (!paused) return;
        const s = state.current;
        if (s.push) s.doors.entrance = 0;
        s.push = null;
        s.pointer = null;
        s.keys.clear();
    }, [paused]);

    const api = useMemo(() => {
        const s = state.current;
        const persist = () => saveSnapshot({ version: 1, place: s.place, pose: clampPose(s.pose, s.place), returnPose: s.returnPose });
        const announce = (place) => {
            s.place = place;
            s.pose = clampPose(s.pose, place);
            s.target = { ...s.pose };
            persist();
            callbacks.current.onPlace(place);
            window.parent.postMessage({ type: EXPERIENCE_MESSAGES.sceneState, place }, window.location.origin);
        };
        const travel = (steps, finish) => {
            s.keys.clear();
            s.push = null;
            s.pointer = null;
            s.queue = steps;
            s.finish = finish;
            s.tween = null;
            invalidate();
        };
        const enter = () => {
            if (s.place !== 'entrance' || s.queue.length || s.tween || s.paused) return;
            s.doors.entrance = 1;
            travel([{ pose: CORRIDOR_POSE, duration: 1.3 }], () => announce('corridor'));
            callbacks.current.onActivity();
        };
        const visit = (room) => {
            if (!ROOM_DOORS[room] || s.queue.length || s.tween || s.place === room) return;
            const door = ROOM_DOORS[room];
            s.returnPose = s.place === 'corridor' ? clampPose(s.pose, 'corridor') : { ...CORRIDOR_POSE };
            s.doors.entrance = 1;
            s.doors[room] = 1;
            if (s.place !== 'corridor') {
                s.pose = { ...s.returnPose };
                s.target = { ...s.pose };
                announce('corridor');
            }
            travel([
                { pose: door.approach, duration: 0.38 },
                { pose: door.inside, duration: 0.65 },
                { pose: ROOM_POSES[room], duration: 0.45 },
            ], () => announce(room));
            callbacks.current.onActivity();
        };
        const back = () => {
            if (s.queue.length || s.tween) return;
            if (s.place === 'entrance') return;
            if (s.place === 'corridor') {
                travel([{ pose: ENTRANCE_POSE, duration: 1.0 }], () => { s.doors.entrance = 0; announce('entrance'); });
                return;
            }
            const room = s.place;
            if (room === 'treasure' || room === 'elemental') {
                s.pose = { ...ROOM_DOORS[room].approach };
                announce('corridor');
            }
            travel([
                ...(room === 'gallery' || room === 'contact' ? [{ pose: ROOM_DOORS[room].inside, duration: 0.35 }, { pose: ROOM_DOORS[room].approach, duration: 0.55 }] : []),
                { pose: s.returnPose, duration: 0.3 },
            ], () => { s.doors[room] = 0; announce('corridor'); });
        };
        return {
            state: s, persist, enter, visit, back,
            entrance: () => {
                if (s.queue.length || s.tween) return;
                s.pose = { ...ENTRANCE_POSE };
                s.doors = { entrance: 0 };
                announce('entrance');
            },
            beginPush: (event) => {
                if (s.place !== 'entrance' || s.paused || s.tween || s.queue.length) return;
                event.stopPropagation();
                event.target.setPointerCapture?.(event.pointerId);
                s.push = { y: event.clientY, pointerId: event.pointerId };
                s.moved = false;
            },
            canActivate: () => !s.moved && !s.paused && !s.tween && !s.queue.length,
        };
    }, [invalidate]);

    useEffect(() => {
        apiRef.current = api;
        return () => { api.persist(); apiRef.current = null; };
    }, [api, apiRef]);

    useEffect(() => {
        const s = state.current;
        const element = gl.domElement;
        element.tabIndex = 0;
        element.setAttribute('aria-label', '3D clubhouse');
        const down = (event) => {
            if (event.button !== 0 || s.paused || s.tween || s.place === 'elemental' || s.place === 'treasure') return;
            s.pointer = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, id: event.pointerId };
            s.moved = false;
        };
        const move = (event) => {
            if (s.paused || s.tween || !s.pointer || event.pointerId !== s.pointer.id) return;
            const p = s.pointer;
            const dx = event.clientX - p.x;
            const dy = event.clientY - p.y;
            if (Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > 7) s.moved = true;
            if (s.push) {
                s.doors.entrance = pushProgress(s.push.y, event.clientY, element.clientHeight);
            } else if (s.place !== 'entrance') {
                s.target.yaw -= dx * 0.006;
                if (s.place === 'corridor') s.target.z += dy * 0.018;
                else s.target.pitch -= dy * 0.004;
                s.target = clampPose(s.target, s.place);
            }
            p.x = event.clientX;
            p.y = event.clientY;
            if (s.moved) callbacks.current.onActivity();
        };
        const up = (event) => {
            if (s.pointer && event.pointerId !== s.pointer.id) return;
            if (s.push) {
                const commit = !s.moved || s.doors.entrance >= 0.35;
                s.push = null;
                if (commit) api.enter();
                else s.doors.entrance = 0;
            }
            s.pointer = null;
            api.persist();
        };
        const cancel = () => {
            if (s.push) s.doors.entrance = 0;
            s.push = null;
            s.pointer = null;
            s.keys.clear();
        };
        const wheel = (event) => {
            if (s.place !== 'corridor' || s.paused || s.tween) return;
            event.preventDefault();
            s.target.z -= event.deltaY * 0.01;
            s.target = clampPose(s.target, s.place);
            callbacks.current.onActivity();
        };
        const key = (event) => {
            if (s.paused || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return;
            if (event.key === 'Escape') { api.back(); return; }
            if (s.place === 'entrance' && ['Enter', ' '].includes(event.key)) { event.preventDefault(); api.enter(); return; }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
                event.preventDefault(); s.keys.add(event.key); callbacks.current.onActivity();
            }
        };
        const keyup = (event) => s.keys.delete(event.key);
        const hidden = () => { if (document.hidden) { cancel(); api.persist(); } };
        element.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        element.addEventListener('wheel', wheel, { passive: false });
        window.addEventListener('keydown', key);
        window.addEventListener('keyup', keyup);
        document.addEventListener('visibilitychange', hidden);
        window.addEventListener('pagehide', api.persist);
        return () => {
            element.removeEventListener('pointerdown', down);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('blur', cancel);
            element.removeEventListener('wheel', wheel);
            window.removeEventListener('keydown', key);
            window.removeEventListener('keyup', keyup);
            document.removeEventListener('visibilitychange', hidden);
            window.removeEventListener('pagehide', api.persist);
        };
    }, [api, gl]);

    useFrame((_, delta) => {
        const s = state.current;
        if (!s.ready) {
            s.ready = true;
            callbacks.current.onReady();
            window.parent.postMessage({ type: EXPERIENCE_MESSAGES.sceneState, place: s.place }, window.location.origin);
        }
        if (s.place === 'treasure' || s.place === 'elemental') return;
        const dt = Math.min(delta, 0.05);
        if (!s.tween && s.queue.length) {
            const next = s.queue.shift();
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            s.tween = { from: { ...s.pose }, to: { ...next.pose, yaw: angleTarget(s.pose.yaw, next.pose.yaw) }, elapsed: 0, duration: reduced ? 0.03 : next.duration };
        }
        if (s.tween) {
            if (s.paused) return;
            s.tween.elapsed += dt;
            const t = Math.min(1, s.tween.elapsed / s.tween.duration);
            for (const key of ['x', 'y', 'z', 'yaw', 'pitch']) s.pose[key] = mix(s.tween.from[key], s.tween.to[key], ease(t));
            if (t === 1) {
                s.target = { ...s.pose };
                s.tween = null;
                if (!s.queue.length) { const finish = s.finish; s.finish = null; finish?.(); }
            }
        } else if (!s.paused && s.place !== 'entrance') {
            if (s.keys.has('ArrowLeft') || s.keys.has('a')) s.target.yaw += dt * 1.3;
            if (s.keys.has('ArrowRight') || s.keys.has('d')) s.target.yaw -= dt * 1.3;
            if (s.place === 'corridor') {
                if (s.keys.has('ArrowUp') || s.keys.has('w')) s.target.z -= dt * 2.8;
                if (s.keys.has('ArrowDown') || s.keys.has('s')) s.target.z += dt * 2.8;
            }
            s.target = clampPose(s.target, s.place);
            const a = 1 - Math.exp(-12 * dt);
            for (const key of ['x', 'y', 'z', 'pitch']) s.pose[key] = mix(s.pose[key], s.target[key], a);
            s.pose.yaw = mix(s.pose.yaw, angleTarget(s.pose.yaw, s.target.yaw), a);
        }
        camera.position.set(s.pose.x, s.pose.y, s.pose.z);
        camera.rotation.set(s.pose.pitch, s.pose.yaw, 0, 'YXZ');
        const roomLens = s.place === 'contact' || s.place === 'gallery';
        const fov = roomLens && camera.aspect < 0.8 ? 76 : 62;
        if (Math.abs(camera.fov - fov) > 0.01) {
            camera.fov = mix(camera.fov, fov, 1 - Math.exp(-8 * dt));
            camera.updateProjectionMatrix();
        }
        s.lastSave += dt;
        if (s.lastSave > 1 && !s.tween) { s.lastSave = 0; api.persist(); }
    });
    return null;
}
