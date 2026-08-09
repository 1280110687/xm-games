import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { PositionalAudio, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import SocialBarrel from './SocialBarrel';
import GalleryClouds from '../Gallery/GalleryClouds';
import { useScene } from '../../../../context/SceneContext';
import { useAchievements } from '../../../../context/AchievementsContext';
import { useAudio } from '../../../../context/AudioManager';
import { usePaintMaterial } from '../Gallery/usePaintMaterial';

const WAVE_LAYERS = 4;

export const AUDIO_SETTINGS = {
    volume: 2,
    distance: 2,
    rolloff: 1.2,
};

export const LATARNIA_SETTINGS = {
    position: [-10, 5, -20],
    rotation: [0, 0.1, 0],
    scale: [4.49, 5],
};

export const STATEK_SETTINGS = {
    position: [0, 1.6, -15],
    rotation: [0, -0.2, 0],
    scale: [3.35, 1.3],
};

const TOOL_BARRELS = [
    { label: 'TEXT', href: '/text-tool', desktop: [-3, 0.5, -10], mobile: [-1.2, 0.5, -10], rotation: [0, 0.2, 0] },
    { label: 'QR', href: '/qr-code', desktop: [-5, -0.3, -8], mobile: [-1.5, -0.3, -7], rotation: [0, 0.3, 0] },
    { label: 'JSON', href: '/json-tool', desktop: [3, 0.5, -10], mobile: [1.2, 0.5, -10], rotation: [0, -0.2, 0] },
    { label: 'CRYPTO', href: '/text-crypto', desktop: [5, -0.3, -8], mobile: [1.5, -0.3, -7], rotation: [0, -0.3, 0] },
    { label: 'ANIME', href: '/anime-tracker', desktop: [0, -0.7, -7], mobile: [0, -0.7, -6], rotation: [0, 0, 0] },
];

const navigateToTool = (href) => {
    window.parent.postMessage(
        { type: 'xm-games:theme-four-navigate', href },
        window.location.origin,
    );
};

const ContactRoom = ({ showRoom, onReady, isExiting, isWarmup }) => {
    const { isTeleporting } = useScene();
    const { showTutorial, hidePopup } = useAchievements();
    const { globalVolume, isMuted } = useAudio();
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;

    const groupRef = useRef();
    const audioRef = useRef();
    const waveRefs = useRef([]);
    const shipRef = useRef();
    const hasSignaledReady = useRef(false);
    const frameCount = useRef(0);
    const teleportedRef = useRef(false);
    const [isMobile, setIsMobile] = useState(false);

    const seaTexture = useTexture('/theme-four-experience/textures/contact/faletopdown.webp');
    const moloTexture = useTexture('/theme-four-experience/textures/contact/molo.webp');
    const lighthouseTexture = useTexture('/theme-four-experience/textures/contact/latarnia.webp');
    const shipTexture = useTexture('/theme-four-experience/textures/contact/statek.webp');

    const {
        onBeforeCompile,
        animatePaint,
        resetPaint,
        uniformsData,
        updateRoomOrigin,
    } = usePaintMaterial({
        dirX: 1,
        dirY: 0,
        dirZ: -0.1,
        startDist: -5,
        endDist: 55,
        noiseAxes: 'yz',
    });

    useEffect(() => {
        const updateMobile = () => setIsMobile(window.innerWidth < 1000);
        updateMobile();
        window.addEventListener('resize', updateMobile);
        return () => window.removeEventListener('resize', updateMobile);
    }, []);

    useEffect(() => {
        seaTexture.wrapS = seaTexture.wrapT = THREE.MirroredRepeatWrapping;
        seaTexture.repeat.set(6, 4);
        seaTexture.needsUpdate = true;

        moloTexture.wrapS = moloTexture.wrapT = THREE.RepeatWrapping;
        moloTexture.center.set(0.5, 0.5);
        moloTexture.rotation = Math.PI / 2;
        moloTexture.repeat.set(1, 1);
        moloTexture.needsUpdate = true;
    }, [seaTexture, moloTexture]);

    useEffect(() => {
        if (audioRef.current?.setVolume) audioRef.current.setVolume(effectiveVolume);
    }, [effectiveVolume]);

    useEffect(() => {
        if (isExiting || isTeleporting) hidePopup();
        if (isTeleporting) teleportedRef.current = true;
    }, [isExiting, isTeleporting, hidePopup]);

    useEffect(() => {
        if (showRoom && !isWarmup) {
            if (teleportedRef.current || isTeleporting) {
                uniformsData.uPaintProgress.value = 1;
            } else {
                resetPaint();
                animatePaint(0.2, 2.5);
            }
        } else {
            uniformsData.uPaintProgress.value = 1;
        }
    }, [showRoom, isWarmup, isTeleporting, animatePaint, resetPaint, uniformsData]);

    useFrame((state) => {
        updateRoomOrigin(groupRef);

        if (!hasSignaledReady.current) {
            frameCount.current += 1;
            if (frameCount.current >= 5) {
                hasSignaledReady.current = true;
                onReady?.();
                if (!isWarmup) setTimeout(() => showTutorial('contact_submit'), 2000);
            }
        }

        const time = state.clock.getElapsedTime();
        waveRefs.current.forEach((wave, index) => {
            if (!wave) return;
            wave.position.y = Math.sin(time * (0.8 + index * 0.15) + index * 0.5) * (0.15 - index * 0.02);
        });

        if (shipRef.current) {
            shipRef.current.position.y = STATEK_SETTINGS.position[1] + Math.sin(time * 0.8) * 0.3;
            shipRef.current.position.x = STATEK_SETTINGS.position[0] + Math.sin(time * 0.04) * 12;
            shipRef.current.rotation.z = Math.sin(time * 0.96) * 0.05;
        }
    });

    return (
        <group ref={groupRef} position={[0, -0.7, -5]}>
            {!isWarmup && (
                <PositionalAudio
                    ref={audioRef}
                    url="/theme-four-experience/sounds/szummorza.mp3"
                    distanceModel="exponential"
                    refDistance={AUDIO_SETTINGS.distance}
                    rolloffFactor={AUDIO_SETTINGS.rolloff}
                    loop
                    autoplay
                    volume={effectiveVolume}
                />
            )}

            <GalleryClouds count={45} seed={88} rotationOffset={[0, 1, 0]} />

            <group position={[0, -1, -8]}>
                {Array.from({ length: WAVE_LAYERS }).map((_, index) => (
                    <mesh
                        key={index}
                        ref={(element) => { waveRefs.current[index] = element; }}
                        position={[0, -index * 0.1, -index * 8]}
                        rotation={[-Math.PI / 2.5, 0, 0]}
                    >
                        <planeGeometry args={[80, 30]} />
                        <meshBasicMaterial
                            map={seaTexture}
                            color="#ffffff"
                            transparent
                            opacity={1 - index * 0.1}
                            side={THREE.DoubleSide}
                            toneMapped={false}
                            onBeforeCompile={onBeforeCompile}
                        />
                    </mesh>
                ))}
            </group>

            {TOOL_BARRELS.map((tool) => (
                <SocialBarrel
                    key={tool.href}
                    position={isMobile ? tool.mobile : tool.desktop}
                    rotation={tool.rotation}
                    texturePath="/theme-four-experience/textures/contact/beczka.webp"
                    label={tool.label}
                    onClick={() => navigateToTool(tool.href)}
                    paintOnBeforeCompile={onBeforeCompile}
                    paintUniforms={uniformsData}
                />
            ))}

            <mesh position={[0, 0.05, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.5, 7]} />
                <meshBasicMaterial
                    map={moloTexture}
                    color="#e0e0e0"
                    side={THREE.DoubleSide}
                    transparent
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            <mesh position={LATARNIA_SETTINGS.position} rotation={LATARNIA_SETTINGS.rotation}>
                <planeGeometry args={LATARNIA_SETTINGS.scale} />
                <meshBasicMaterial
                    color="#e0e0e0"
                    map={lighthouseTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            <mesh ref={shipRef} position={STATEK_SETTINGS.position} rotation={STATEK_SETTINGS.rotation}>
                <planeGeometry args={STATEK_SETTINGS.scale} />
                <meshBasicMaterial
                    color="#e0e0e0"
                    map={shipTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>
        </group>
    );
};

export default ContactRoom;
