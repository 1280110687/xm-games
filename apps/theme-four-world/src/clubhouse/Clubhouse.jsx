import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { CLUBHOUSE_ROOM_NAMES, CLUBHOUSE_ROOMS, EXPERIENCE_MESSAGES, isContextMessage, isClubhouseCommand } from '@xm-games/experience-bridge';
import { usePerformance } from '../context/PerformanceContext';
import { useScene } from '../context/SceneContext';
import { ClubMaterials, Plaque } from './materials';
import Architecture from './architecture';
import { GameRoom, ToolWorkshop } from './furniture';
import Controller from './controller';
import { COPY, readSnapshot } from './model';
import './clubhouse.css';

const TreasureRoom = lazy(() => import('../components/canvas/rooms/Treasure/TreasureRoom'));
const TreasureHud = lazy(() => import('../components/ui/TreasureHuntHud'));
const ElementalArena = lazy(() => import('../components/ui/ElementalArenaExperience'));

function FramePolicy({ place }) {
    const { setFrameloop, invalidate } = useThree();
    const ticks = useRef(0);
    useEffect(() => {
        ticks.current = 0;
        setFrameloop('always');
        invalidate();
        return () => setFrameloop('always');
    }, [place, setFrameloop, invalidate]);
    useFrame(() => {
        if (place === 'elemental' && ++ticks.current > 2) setFrameloop('never');
    });
    return null;
}

function SceneSync({ place, apiRef }) {
    const { enterRoom, exitRoom, exitRequested, clearExitRequest } = useScene();
    useEffect(() => {
        if (CLUBHOUSE_ROOMS.includes(place)) enterRoom(place);
        else exitRoom();
    }, [place, enterRoom, exitRoom]);
    useEffect(() => {
        if (exitRequested) { apiRef.current?.back(); clearExitRequest(); }
    }, [exitRequested, clearExitRequest, apiRef]);
    return null;
}

function ExitPlaque({ room, label, apiRef }) {
    const right = room === 'contact';
    return <group position={[right ? 3.16 : -3.16, 2.4, -0.65]} rotation={[0, right ? Math.PI / 2 : -Math.PI / 2, 0]} onClick={(event) => { event.stopPropagation(); if (apiRef.current?.canActivate()) apiRef.current.back(); }}>
        <Plaque text={label} width={1.05} height={0.36} />
        <mesh visible={false}><boxGeometry args={[1.2, 0.65, 0.2]} /><meshBasicMaterial /></mesh>
    </group>;
}

export default function Clubhouse() {
    const [initial] = useState(readSnapshot);
    const [place, setPlace] = useState(initial.place);
    const [manifest, setManifest] = useState(() => {
        // Hash context keeps the HTTP cache key identical to the offline manifest.
        const locale = new URLSearchParams(window.location.hash.slice(1)).get('locale');
        return { locale: ['zh', 'en', 'th'].includes(locale) ? locale : 'en', categories: [] };
    });
    const [paused, setPaused] = useState(false);
    const [ready, setReady] = useState(false);
    const [hint, setHint] = useState(true);
    const [category, setCategory] = useState(null);
    const apiRef = useRef(null);
    const { settings, downgradeTier } = usePerformance();
    const copy = COPY[manifest.locale];
    const names = CLUBHOUSE_ROOM_NAMES[manifest.locale];

    useEffect(() => {
        window.parent.postMessage({ type: EXPERIENCE_MESSAGES.booted }, window.location.origin);
        const message = (event) => {
            if (isContextMessage(event, window.location.origin, window.parent)) {
                setManifest(event.data.payload);
                document.documentElement.lang = event.data.payload.locale;
                return;
            }
            if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== EXPERIENCE_MESSAGES.sceneCommand || !isClubhouseCommand(event.data.payload)) return;
            const command = event.data.payload;
            if (command.action === 'pause') { setPaused(command.paused); return; }
            setCategory(null);
            if (command.action === 'visit') apiRef.current?.visit(command.room);
            if (command.action === 'back') apiRef.current?.back();
            if (command.action === 'entrance') apiRef.current?.entrance();
        };
        window.addEventListener('message', message);
        return () => window.removeEventListener('message', message);
    }, []);

    useEffect(() => {
        if (!ready) return;
        const frame = requestAnimationFrame(() => window.parent.postMessage({ type: EXPERIENCE_MESSAGES.ready }, window.location.origin));
        return () => cancelAnimationFrame(frame);
    }, [ready]);
    useEffect(() => {
        setHint(true);
        const timeout = window.setTimeout(() => setHint(false), place === 'entrance' ? 9000 : 6500);
        return () => window.clearTimeout(timeout);
    }, [place]);

    const navigate = useCallback((href) => {
        if (!manifest.categories.some((section) => section.games.some((game) => game.href === href))) return;
        apiRef.current?.persist();
        window.parent.postMessage({ type: EXPERIENCE_MESSAGES.navigate, href }, window.location.origin);
    }, [manifest.categories]);
    const chooseCategory = useCallback((id) => setCategory(id), []);
    const activity = useCallback(() => setHint(false), []);
    const sceneReady = useCallback(() => setReady(true), []);
    const special = place === 'treasure' || place === 'elemental';
    const categoryData = manifest.categories.find((section) => section.id === category);

    return <main className="clubhouse" data-place={place} data-ready={ready}>
        <SceneSync place={place} apiRef={apiRef} />
        <Canvas camera={{ position: [initial.pose.x, initial.pose.y, initial.pose.z], fov: 62, near: 0.08, far: 70 }} dpr={settings.dpr} shadows={settings.shadows} gl={{ antialias: settings.antialias, alpha: false, powerPreference: settings.powerPreference, failIfMajorPerformanceCaveat: true }}>
            <color attach="background" args={['#d6e4e6']} />
            <PerformanceMonitor onDecline={downgradeTier} flipflops={3} onFallback={downgradeTier} />
            <Suspense fallback={null}>
                <ClubMaterials>
                    <Controller initial={initial} apiRef={apiRef} onPlace={setPlace} onReady={sceneReady} onActivity={activity} paused={paused || !!category} />
                    <FramePolicy place={place} />
                    {!special && <>
                        <hemisphereLight args={['#f4f4e7', '#b9a389', 1.5]} />
                        <ambientLight intensity={0.3} />
                        <directionalLight position={[4, 12, 7]} intensity={3.2} color="#fff0d4" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-far={35} shadow-normalBias={0.025} shadow-bias={-0.0008} shadow-radius={3} />
                        <pointLight position={[0, 3.9, -4]} intensity={8} color="#ffe2ad" distance={16} decay={2} />
                        <pointLight position={[6.3, 3.7, -2.5]} intensity={14} color="#fff3db" distance={10} decay={2} />
                        <pointLight position={[-6.3, 3.7, -2.5]} intensity={12} color="#fff3db" distance={10} decay={2} />
                        <Architecture apiRef={apiRef} locale={manifest.locale} />
                        <ToolWorkshop apiRef={apiRef} locale={manifest.locale} categories={manifest.categories} onNavigate={navigate} />
                        <GameRoom apiRef={apiRef} locale={manifest.locale} onCategory={chooseCategory} />
                        {(place === 'contact' || place === 'gallery') && <ExitPlaque room={place} label={copy.exit} apiRef={apiRef} />}
                    </>}
                    {place === 'treasure' && <Suspense fallback={null}><TreasureRoom onReady={() => {}} isExiting={false} /></Suspense>}
                </ClubMaterials>
            </Suspense>
        </Canvas>
        {!special && !category && <p className="clubhouse-hint" data-visible={hint} aria-hidden={!hint} aria-live="polite">{place === 'entrance' ? copy.push : place === 'corridor' ? copy.explore : copy.objects}</p>}
        <Suspense fallback={<p className="clubhouse-room-loading" role="status">{copy.loading}</p>}>
            {place === 'treasure' && <TreasureHud hostLocale={manifest.locale} />}
            {place === 'elemental' && <ElementalArena locale={manifest.locale} />}
        </Suspense>
        {/* Equivalent keyboard controls, not a visible toolbar. */}
        {!category && <div className="clubhouse-accessible" aria-label={copy.clubhouse}>
            {place === 'entrance' ? <button onClick={() => apiRef.current?.enter()}>{copy.enter}</button> : <>
                <button onClick={() => apiRef.current?.back()}>{copy.back}</button>
                {place === 'corridor' && CLUBHOUSE_ROOMS.map((id) => <button key={id} onClick={() => apiRef.current?.visit(id)}>{copy.roomEntry} {names[id]}</button>)}
                {place === 'contact' && (manifest.categories.find((section) => section.id === 'categoryTools')?.games || []).map((game) => <button key={game.href} onClick={() => navigate(game.href)}>{game.label}</button>)}
                {place === 'gallery' && manifest.categories.filter((section) => section.id !== 'categoryTools').map((section) => <button key={section.id} onClick={() => setCategory(section.id)}>{section.label}</button>)}
            </>}
        </div>}
        {categoryData && <GameSelection category={categoryData} closeLabel={copy.close} onClose={() => setCategory(null)} onNavigate={navigate} />}
    </main>;
}

function GameSelection({ category, closeLabel, onClose, onNavigate }) {
    const ref = useRef();
    useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
    return <dialog ref={ref} className="clubhouse-game-selection" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <header><h2>{category.label}</h2><button type="button" onClick={onClose}>{closeLabel}</button></header>
        <div>{category.games.map((game) => <button key={game.href} onClick={() => onNavigate(game.href)}><strong>{game.label}</strong><span>{game.description}</span></button>)}</div>
    </dialog>;
}
