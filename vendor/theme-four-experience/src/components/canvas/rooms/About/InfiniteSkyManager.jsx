import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import SkyChunk, { CHUNK_LENGTH, ROOM_Z } from './SkyChunk';

const STORY_CYCLE_LENGTH = 160;
const MILESTONE_CORRIDOR_CLIP_Z = -8;

const XM_STORY = [
    {
        offset: 15,
        kicker: 'XM-GAMES',
        title: 'PLAY ANYWHERE',
        detail: 'GAMES · TOOLS · FOUR 3D WORLDS',
        accent: '#286f72',
    },
    {
        offset: 55,
        kicker: 'GAME LIBRARY',
        title: 'QUICK TO START',
        detail: 'BOARD · PUZZLE · FOCUS · ARCADE',
        accent: '#c97758',
    },
    {
        offset: 95,
        kicker: 'LOCAL + LAN',
        title: 'PLAY TOGETHER',
        detail: 'BINGO · CHESS · MOBILE FIRST',
        accent: '#6d8f54',
    },
    {
        offset: 135,
        kicker: 'ONE COLLECTION',
        title: 'FOUR WORLDS',
        detail: '中文 · ENGLISH · ไทย',
        accent: '#7a5c8f',
    },
];

const XmStoryMilestone = ({ z, scrollProgressRef, story, index }) => {
    const groupRef = useRef();
    const kickerRef = useRef();
    const titleRef = useRef();
    const detailRef = useRef();
    const lineRef = useRef();

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;
        if (!groupRef.current.visible) return;

        const fadeIn = THREE.MathUtils.smoothstep(worldZ, -70, -30);
        const fadeOut = 1 - THREE.MathUtils.smoothstep(worldZ, -14, -8);
        const opacity = THREE.MathUtils.clamp(fadeIn * fadeOut, 0, 1);
        const spread = THREE.MathUtils.smoothstep(worldZ, -45, -12);
        const time = state.clock.elapsedTime + index * 1.7;

        groupRef.current.position.y = Math.sin(time * 0.45) * 0.18;
        groupRef.current.rotation.z = Math.sin(time * 0.2) * 0.018;
        groupRef.current.scale.lerp(
            new THREE.Vector3(0.82 + opacity * 0.18, 0.82 + opacity * 0.18, 1),
            1 - Math.pow(0.04, delta),
        );

        if (kickerRef.current) {
            kickerRef.current.position.x = -spread * 5.5;
            kickerRef.current.fillOpacity = opacity;
        }
        if (titleRef.current) {
            titleRef.current.position.x = spread * 3.5;
            titleRef.current.fillOpacity = opacity;
        }
        if (detailRef.current) {
            detailRef.current.position.x = -spread * 2.5;
            detailRef.current.fillOpacity = opacity;
        }
        if (lineRef.current) lineRef.current.material.opacity = opacity * 0.85;
    });

    return (
        <group ref={groupRef} position={[0, 0, z]}>
            <Text
                ref={kickerRef}
                position={[0, 2.1, 0.08]}
                fontSize={0.46}
                color={story.accent}
                anchorX="center"
                anchorY="middle"
                font="/theme-four-experience/fonts/CabinSketch-Bold.ttf"
                fillOpacity={0}
            >
                {story.kicker}
            </Text>
            <Text
                ref={titleRef}
                position={[0, 0.75, 0.1]}
                fontSize={1.45}
                maxWidth={12}
                textAlign="center"
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/theme-four-experience/fonts/RubikScribble-Regular.ttf"
                fillOpacity={0}
            >
                {story.title}
            </Text>
            <mesh ref={lineRef} position={[0, -0.45, 0]}>
                <planeGeometry args={[6.5, 0.045]} />
                <meshBasicMaterial color={story.accent} transparent opacity={0} />
            </mesh>
            <Text
                ref={detailRef}
                position={[0, -1.25, 0.08]}
                fontSize={0.34}
                maxWidth={10}
                textAlign="center"
                color="#4a4a4a"
                anchorX="center"
                anchorY="middle"
                font="/theme-four-experience/fonts/CabinSketch-Regular.ttf"
                fillOpacity={0}
            >
                {story.detail}
            </Text>
        </group>
    );
};

const InfiniteSkyManager = ({ scrollProgressRef }) => {
    const [activeChunks, setActiveChunks] = useState([-1, 0, 1, 2]);
    const [activeStoryCycles, setActiveStoryCycles] = useState([-1, 0, 1]);
    const worldRef = useRef();

    useFrame(() => {
        if (!worldRef.current) return;

        const scrollProgress = scrollProgressRef?.current || 0;
        worldRef.current.position.z = scrollProgress;

        const currentChunk = Math.floor(scrollProgress / CHUNK_LENGTH);
        const nextChunks = [currentChunk - 1, currentChunk, currentChunk + 1, currentChunk + 2];
        if (nextChunks.some((chunk) => !activeChunks.includes(chunk))) setActiveChunks(nextChunks);

        const currentCycle = Math.floor(scrollProgress / STORY_CYCLE_LENGTH);
        const nextCycles = [currentCycle - 1, currentCycle, currentCycle + 1];
        if (nextCycles.some((cycle) => !activeStoryCycles.includes(cycle))) setActiveStoryCycles(nextCycles);
    });

    return (
        <group ref={worldRef}>
            {activeChunks.map((chunkIndex) => (
                <SkyChunk
                    key={`sky-chunk-${chunkIndex}`}
                    chunkIndex={chunkIndex}
                    seed={42}
                    scrollProgressRef={scrollProgressRef}
                />
            ))}

            {activeStoryCycles.flatMap((cycleIndex) => (
                XM_STORY.map((story, index) => (
                    <XmStoryMilestone
                        key={`${cycleIndex}-${story.offset}`}
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + story.offset)}
                        scrollProgressRef={scrollProgressRef}
                        story={story}
                        index={index}
                    />
                ))
            ))}
        </group>
    );
};

export default InfiniteSkyManager;
