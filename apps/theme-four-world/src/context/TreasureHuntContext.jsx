import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useScene } from './SceneContext';
import { createHuntClock } from './hunt-clock';
import { createPausableTimeout } from './pausable-timeout';

export const MUSEUM_CLUES = [
    { id: 'prism', objective: 'prism', interaction: 'clue', step: 0 },
    { id: 'constellation', objective: 'constellation', interaction: 'clue', step: 1 },
    { id: 'power-cell', objective: 'powerCell', interaction: 'clue', step: 2 },
];

export const MUSEUM_INTERACTIONS = [
    ...MUSEUM_CLUES,
    { id: 'vault', objective: 'vault', interaction: 'vault' },
    { id: 'broken-watch', objective: 'brokenWatch', interaction: 'decoy' },
    { id: 'glass-key', objective: 'glassKey', interaction: 'decoy' },
    { id: 'empty-frame', objective: 'emptyFrame', interaction: 'decoy' },
];

export const NIGHT_MUSEUM_CLUE_COUNT = MUSEUM_CLUES.length;

const BEST_RUN_KEY = 'xm-games:theme-four:night-museum-best';
const TreasureHuntContext = createContext(null);

const calculateScore = ({ elapsedMs, hintsUsed, mistakes }) => Math.max(
    1000,
    Math.round(12000 - elapsedMs / 35 - hintsUsed * 700 - mistakes * 350),
);

export const useTreasureHunt = () => {
    const context = useContext(TreasureHuntContext);
    if (!context) {
        throw new Error('useTreasureHunt must be used within a TreasureHuntProvider');
    }
    return context;
};

export const TreasureHuntProvider = ({ children }) => {
    const { currentRoom, exitRequested } = useScene();
    const [status, setStatus] = useState('idle');
    const [hostPaused, setHostPausedState] = useState(false);
    const [clueStep, setClueStep] = useState(0);
    const [discoveredIds, setDiscoveredIds] = useState(() => new Set());
    const [elapsedMs, setElapsedMs] = useState(0);
    const [bestRun, setBestRun] = useState(null);
    const [score, setScore] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [flashlightOn, setFlashlightOn] = useState(true);
    const [battery, setBattery] = useState(100);
    const [runId, setRunId] = useState(0);
    const [focusId, setFocusIdState] = useState(null);
    const [hintTargetId, setHintTargetId] = useState(null);
    const [message, setMessage] = useState({ key: 'briefing', tone: 'info', nonce: 0 });

    const statusRef = useRef('idle');
    const clueStepRef = useRef(0);
    const discoveredIdsRef = useRef(new Set());
    const clockRef = useRef(null);
    if (!clockRef.current) clockRef.current = createHuntClock();
    const hostPausedRef = useRef(false);
    const bestRunRef = useRef(null);
    const hintsUsedRef = useRef(0);
    const mistakesRef = useRef(0);
    const focusIdRef = useRef(null);
    const batteryRef = useRef(100);
    const flashlightOnRef = useRef(true);
    const previousRoomRef = useRef(null);
    const hintTimerRef = useRef(null);
    const messageTimerRef = useRef(null);
    if (!hintTimerRef.current) hintTimerRef.current = createPausableTimeout();
    if (!messageTimerRef.current) messageTimerRef.current = createPausableTimeout();
    const controlsRef = useRef({ moveX: 0, moveY: 0, lookX: 0, lookY: 0, sprint: false });

    const updateStatus = useCallback((nextStatus) => {
        statusRef.current = nextStatus;
        setStatus(nextStatus);
    }, []);

    const setHostPaused = useCallback((paused) => {
        if (hostPausedRef.current === paused) return;
        hostPausedRef.current = paused;
        clockRef.current.setPaused(paused);
        hintTimerRef.current.setPaused(paused);
        messageTimerRef.current.setPaused(paused);
        if (paused) {
            controlsRef.current = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, sprint: false };
            if (statusRef.current === 'running') {
                setElapsedMs(clockRef.current.elapsed());
                if (document.pointerLockElement) document.exitPointerLock?.();
            }
        }
        setHostPausedState(paused);
    }, []);

    const showMessage = useCallback((key, tone = 'info', duration = 3200) => {
        messageTimerRef.current.clear();
        setMessage((previous) => ({ key, tone, nonce: previous.nonce + 1 }));

        if (duration > 0) {
            messageTimerRef.current.start(() => {
                setMessage((previous) => ({ key: null, tone: 'info', nonce: previous.nonce + 1 }));
            }, duration);
        }
    }, []);

    const clearHint = useCallback(() => {
        hintTimerRef.current.clear();
        setHintTargetId(null);
    }, []);

    const startNewHunt = useCallback(() => {
        clearHint();
        messageTimerRef.current.clear();

        const emptyDiscoveredIds = new Set();
        const now = Date.now();
        discoveredIdsRef.current = emptyDiscoveredIds;
        clueStepRef.current = 0;
        clockRef.current.start(hostPausedRef.current);
        hintsUsedRef.current = 0;
        mistakesRef.current = 0;
        focusIdRef.current = null;
        controlsRef.current = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, sprint: false };

        setDiscoveredIds(emptyDiscoveredIds);
        setClueStep(0);
        setElapsedMs(0);
        setScore(0);
        setHintsUsed(0);
        setMistakes(0);
        setFlashlightOn(true);
        setBattery(100);
        batteryRef.current = 100;
        flashlightOnRef.current = true;
        setRunId((currentRunId) => currentRunId + 1);
        setFocusIdState(null);
        setMessage({ key: 'briefing', tone: 'info', nonce: now });
        updateStatus('running');
    }, [clearHint, updateStatus]);

    useEffect(() => {
        try {
            const storedRun = JSON.parse(window.localStorage.getItem(BEST_RUN_KEY) || 'null');
            if (
                storedRun &&
                Number.isFinite(storedRun.elapsedMs) &&
                storedRun.elapsedMs > 0 &&
                Number.isFinite(storedRun.score)
            ) {
                bestRunRef.current = storedRun;
                setBestRun(storedRun);
            }
        } catch {
            // Best-run persistence is optional; gameplay does not depend on storage access.
        }
    }, []);

    useEffect(() => {
        const wasInTreasureRoom = previousRoomRef.current === 'treasure';
        if (currentRoom === 'treasure' && !wasInTreasureRoom) {
            startNewHunt();
        } else if (currentRoom !== 'treasure' && wasInTreasureRoom && statusRef.current === 'running') {
            updateStatus('paused');
        }
        previousRoomRef.current = currentRoom;
    }, [currentRoom, startNewHunt, updateStatus]);

    useEffect(() => {
        if (currentRoom === 'treasure' && exitRequested && statusRef.current === 'running') {
            updateStatus('paused');
            if (document.pointerLockElement) document.exitPointerLock?.();
        }
    }, [currentRoom, exitRequested, updateStatus]);

    useEffect(() => {
        if (status !== 'running' || hostPaused) return undefined;
        const timer = window.setInterval(() => {
            if (statusRef.current !== 'running' || hostPausedRef.current) return;
            setElapsedMs(clockRef.current.elapsed());
        }, 100);
        return () => window.clearInterval(timer);
    }, [hostPaused, status]);

    useEffect(() => {
        if (status !== 'running' || hostPaused) return undefined;
        const batteryTimer = window.setInterval(() => {
            if (statusRef.current !== 'running' || hostPausedRef.current) return;
            const nextBattery = flashlightOnRef.current
                ? Math.max(0, batteryRef.current - 0.2)
                : Math.min(100, batteryRef.current + 0.58);
            batteryRef.current = nextBattery;
            setBattery(nextBattery);
            if (nextBattery === 0 && flashlightOnRef.current) {
                flashlightOnRef.current = false;
                setFlashlightOn(false);
                showMessage('batteryEmpty', 'warning', 3600);
            }
        }, 250);
        return () => window.clearInterval(batteryTimer);
    }, [hostPaused, showMessage, status]);

    useEffect(() => () => {
        hintTimerRef.current.clear();
        messageTimerRef.current.clear();
    }, []);

    const setFocusId = useCallback((nextFocusId) => {
        if (focusIdRef.current === nextFocusId) return;
        focusIdRef.current = nextFocusId;
        setFocusIdState(nextFocusId);
    }, []);

    const finishRun = useCallback(() => {
        const finalElapsedMs = clockRef.current.elapsed();
        const finalScore = calculateScore({
            elapsedMs: finalElapsedMs,
            hintsUsed: hintsUsedRef.current,
            mistakes: mistakesRef.current,
        });
        const completedRun = { elapsedMs: finalElapsedMs, score: finalScore };

        setElapsedMs(finalElapsedMs);
        setScore(finalScore);
        updateStatus('completed');
        showMessage('vaultOpened', 'success', 0);
        if (document.pointerLockElement) document.exitPointerLock?.();

        if (!bestRunRef.current || finalScore > bestRunRef.current.score) {
            bestRunRef.current = completedRun;
            setBestRun(completedRun);
            try {
                window.localStorage.setItem(BEST_RUN_KEY, JSON.stringify(completedRun));
            } catch {
                // The completed score remains visible even if persistence is unavailable.
            }
        }
    }, [showMessage, updateStatus]);

    const interact = useCallback((interactionId) => {
        if (statusRef.current !== 'running' || hostPausedRef.current || !interactionId) return;
        const interaction = MUSEUM_INTERACTIONS.find((item) => item.id === interactionId);
        if (!interaction) return;

        if (interaction.interaction === 'decoy') {
            mistakesRef.current += 1;
            setMistakes(mistakesRef.current);
            showMessage(`decoy:${interaction.id}`, 'warning');
            return;
        }

        if (interaction.interaction === 'vault') {
            if (clueStepRef.current < NIGHT_MUSEUM_CLUE_COUNT) {
                showMessage('vaultLocked', 'warning');
                return;
            }
            finishRun();
            return;
        }

        if (discoveredIdsRef.current.has(interaction.id)) {
            showMessage('alreadyFound', 'info', 1800);
            return;
        }

        if (interaction.step !== clueStepRef.current) {
            showMessage('wrongOrder', 'warning');
            return;
        }

        const nextDiscoveredIds = new Set(discoveredIdsRef.current);
        nextDiscoveredIds.add(interaction.id);
        discoveredIdsRef.current = nextDiscoveredIds;
        clueStepRef.current += 1;
        setDiscoveredIds(nextDiscoveredIds);
        setClueStep(clueStepRef.current);
        clearHint();
        showMessage(`clue:${interaction.id}`, 'success', 4200);
    }, [clearHint, finishRun, showMessage]);

    const interactFocused = useCallback(() => {
        interact(focusIdRef.current);
    }, [interact]);

    const toggleFlashlight = useCallback(() => {
        if (statusRef.current !== 'running' || hostPausedRef.current) return;
        if (!flashlightOnRef.current && batteryRef.current <= 4) {
            showMessage('batteryCharging', 'warning', 2200);
            return;
        }
        flashlightOnRef.current = !flashlightOnRef.current;
        setFlashlightOn(flashlightOnRef.current);
    }, [showMessage]);

    const requestHint = useCallback(() => {
        if (statusRef.current !== 'running' || hostPausedRef.current) return;
        const nextTarget = MUSEUM_CLUES[clueStepRef.current]?.id || 'vault';
        hintsUsedRef.current += 1;
        setHintsUsed(hintsUsedRef.current);
        clearHint();
        setHintTargetId(nextTarget);
        showMessage(`hint:${nextTarget}`, 'hint', 5600);
        hintTimerRef.current.start(() => {
            setHintTargetId(null);
        }, 6000);
    }, [clearHint, showMessage]);

    const setMoveInput = useCallback((moveX, moveY) => {
        if (hostPausedRef.current) return;
        controlsRef.current.moveX = Math.max(-1, Math.min(1, moveX));
        controlsRef.current.moveY = Math.max(-1, Math.min(1, moveY));
    }, []);

    const addLookInput = useCallback((lookX, lookY) => {
        if (hostPausedRef.current) return;
        controlsRef.current.lookX += lookX;
        controlsRef.current.lookY += lookY;
    }, []);

    const setSprintInput = useCallback((sprint) => {
        if (hostPausedRef.current) return;
        controlsRef.current.sprint = Boolean(sprint);
    }, []);

    const value = useMemo(() => ({
        addLookInput,
        battery,
        bestRun,
        clueStep,
        controlsRef,
        discoveredIds,
        elapsedMs,
        flashlightOn,
        focusId,
        hintTargetId,
        hintsUsed,
        interact,
        interactFocused,
        message,
        mistakes,
        requestHint,
        restartHunt: startNewHunt,
        runId,
        score,
        setFocusId,
        setHostPaused,
        setMoveInput,
        setSprintInput,
        status: hostPaused && status === 'running' ? 'paused' : status,
        toggleFlashlight,
        totalClues: NIGHT_MUSEUM_CLUE_COUNT,
    }), [
        addLookInput,
        battery,
        bestRun,
        clueStep,
        discoveredIds,
        elapsedMs,
        flashlightOn,
        focusId,
        hintTargetId,
        hintsUsed,
        hostPaused,
        interact,
        interactFocused,
        message,
        mistakes,
        requestHint,
        runId,
        score,
        setFocusId,
        setHostPaused,
        setMoveInput,
        setSprintInput,
        startNewHunt,
        status,
        toggleFlashlight,
    ]);

    return (
        <TreasureHuntContext.Provider value={value}>
            {children}
        </TreasureHuntContext.Provider>
    );
};

export default TreasureHuntContext;
