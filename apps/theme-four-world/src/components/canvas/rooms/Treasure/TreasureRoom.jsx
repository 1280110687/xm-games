import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '../../../../context/SceneContext';
import { useTreasureHunt } from '../../../../context/TreasureHuntContext';

const FONT_BOLD = '/theme-four-experience/fonts/CabinSketch-Bold.ttf';
const FONT_REGULAR = '/theme-four-experience/fonts/CabinSketch-Regular.ttf';
const PLAYER_START = new THREE.Vector3(0, 1.08, -3.45);
const PLAYER_RADIUS = 0.38;
const WALK_SPEED = 3.15;
const SPRINT_SPEED = 4.65;
const INTERACTION_DISTANCE = 4.25;

const OBSTACLES = [
    { minX: -2.45, maxX: 2.45, minZ: -14.25, maxZ: -11.35 },
    { minX: -6.25, maxX: -3.35, minZ: -10.55, maxZ: -7.2 },
    { minX: 3.25, maxX: 6.3, minZ: -13.2, maxZ: -9.5 },
    { minX: 3.25, maxX: 6.25, minZ: -22.35, maxZ: -18.4 },
    { minX: -2.9, maxX: 2.9, minZ: -28.65, maxZ: -25.8 },
];

const seededNoise = (index) => {
    const value = Math.sin(index * 91.137 + 17.31) * 43758.5453;
    return value - Math.floor(value);
};

const createParquetTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    context.fillStyle = '#17191a';
    context.fillRect(0, 0, 512, 512);

    const boardHeight = 48;
    for (let row = 0; row < 12; row += 1) {
        const offset = row % 2 ? -96 : 0;
        for (let column = -1; column < 5; column += 1) {
            const noise = seededNoise(row * 7 + column + 5);
            const lightness = 21 + Math.round(noise * 9);
            context.fillStyle = `hsl(31 28% ${lightness}%)`;
            context.fillRect(offset + column * 145, row * boardHeight, 141, boardHeight - 3);
            context.strokeStyle = 'rgba(230, 176, 100, 0.09)';
            context.beginPath();
            context.moveTo(offset + column * 145 + 14, row * boardHeight + 8 + noise * 8);
            context.lineTo(offset + column * 145 + 126, row * boardHeight + 14 + noise * 10);
            context.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.3, 6.5);
    texture.anisotropy = 4;
    return texture;
};

const createPlasterTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    context.fillStyle = '#202426';
    context.fillRect(0, 0, 384, 384);
    for (let index = 0; index < 1900; index += 1) {
        const x = seededNoise(index * 3) * 384;
        const y = seededNoise(index * 3 + 1) * 384;
        const alpha = 0.018 + seededNoise(index * 3 + 2) * 0.045;
        context.fillStyle = index % 3 === 0
            ? `rgba(196, 208, 204, ${alpha})`
            : `rgba(0, 0, 0, ${alpha})`;
        context.fillRect(x, y, 1 + (index % 3), 1 + ((index + 1) % 3));
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
};

const MuseumLabel = ({ children, position, rotation = [0, 0, 0], color = '#c7b78f', size = 0.16 }) => (
    <Text
        position={position}
        rotation={rotation}
        font={FONT_BOLD}
        fontSize={size}
        color={color}
        anchorX="center"
        anchorY="middle"
    >
        {children}
    </Text>
);

const BrassRail = ({ start, end }) => {
    const midpoint = useMemo(() => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5), [end, start]);
    const length = useMemo(() => new THREE.Vector3().subVectors(end, start).length(), [end, start]);
    const quaternion = useMemo(() => {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    }, [end, start]);

    return (
        <mesh position={midpoint} quaternion={quaternion} castShadow>
            <cylinderGeometry args={[0.025, 0.025, length, 8]} />
            <meshStandardMaterial color="#8f7240" metalness={0.82} roughness={0.28} />
        </mesh>
    );
};

const DisplayPlinth = ({ position, width = 1.4, depth = 1.4, children, label }) => (
    <group position={position}>
        <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, 1.12, depth]} />
            <meshStandardMaterial color="#24282a" roughness={0.68} metalness={0.06} />
        </mesh>
        <mesh position={[0, 0.59, 0]} castShadow receiveShadow>
            <boxGeometry args={[width + 0.11, 0.08, depth + 0.11]} />
            <meshStandardMaterial color="#a4864d" roughness={0.34} metalness={0.75} />
        </mesh>
        <MuseumLabel position={[0, -0.15, depth / 2 + 0.015]} size={0.105}>{label}</MuseumLabel>
        {children}
    </group>
);

const GlassCase = ({ width = 1.35, height = 1.25, depth = 1.35, position = [0, 1.22, 0] }) => (
    <group position={position}>
        <mesh>
            <boxGeometry args={[width, height, depth]} />
            <meshPhysicalMaterial
                color="#9cc9cd"
                transparent
                opacity={0.1}
                roughness={0.08}
                metalness={0.02}
                transmission={0.25}
                depthWrite={false}
            />
        </mesh>
        {[
            [[-width / 2, -height / 2, -depth / 2], [-width / 2, height / 2, -depth / 2]],
            [[width / 2, -height / 2, -depth / 2], [width / 2, height / 2, -depth / 2]],
            [[-width / 2, -height / 2, depth / 2], [-width / 2, height / 2, depth / 2]],
            [[width / 2, -height / 2, depth / 2], [width / 2, height / 2, depth / 2]],
            [[-width / 2, height / 2, -depth / 2], [width / 2, height / 2, -depth / 2]],
            [[-width / 2, height / 2, depth / 2], [width / 2, height / 2, depth / 2]],
            [[-width / 2, height / 2, -depth / 2], [-width / 2, height / 2, depth / 2]],
            [[width / 2, height / 2, -depth / 2], [width / 2, height / 2, depth / 2]],
        ].map(([start, end]) => (
            <BrassRail key={`${start.join(':')}-${end.join(':')}`} start={new THREE.Vector3(...start)} end={new THREE.Vector3(...end)} />
        ))}
    </group>
);

const HintBeacon = ({ active, color = '#f2c86f' }) => {
    const ref = useRef();
    useFrame((state) => {
        if (!ref.current || !active) return;
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12;
        ref.current.scale.setScalar(pulse);
        ref.current.rotation.z += 0.012;
    });
    if (!active) return null;
    return (
        <group ref={ref}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.58, 0.026, 8, 40]} />
                <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
            </mesh>
            <pointLight color={color} intensity={1.8} distance={3.2} decay={2} />
        </group>
    );
};

const PrismClue = ({ discovered, flashlightOn, hinted }) => {
    const objectRef = useRef();
    const revealed = flashlightOn || discovered;
    useFrame((state, delta) => {
        if (!objectRef.current) return;
        objectRef.current.rotation.y += delta * (discovered ? 0.24 : 0.55);
        objectRef.current.position.y = 1.32 + Math.sin(state.clock.elapsedTime * 1.8) * 0.035;
    });

    return (
        <group
            position={[-4.78, -0.02, -8.9]}
            userData={{ interactionId: 'prism', interactionEnabled: revealed }}
        >
            <DisplayPlinth position={[0, 0, 0]} label="OPTICAL STUDY · 1978">
                <group ref={objectRef} position={[0, 1.32, 0]} visible={revealed}>
                    <mesh castShadow>
                        <octahedronGeometry args={[0.43, 0]} />
                        <meshPhysicalMaterial
                            color={discovered ? '#ffd889' : '#76d9e8'}
                            emissive={discovered ? '#b9782d' : '#1c819b'}
                            emissiveIntensity={discovered ? 1.2 : 2.2}
                            roughness={0.1}
                            metalness={0.18}
                            transmission={0.3}
                        />
                    </mesh>
                    <Sparkles count={18} scale={1.4} size={2.4} speed={0.3} color="#8ee9ff" />
                    <HintBeacon active={hinted} />
                </group>
                <GlassCase />
            </DisplayPlinth>
        </group>
    );
};

const ConstellationClue = ({ discovered, flashlightOn, hinted }) => {
    const revealed = flashlightOn || discovered;
    const points = [
        [-0.75, 0.28], [-0.34, 0.72], [0.06, 0.31], [0.45, 0.64], [0.78, 0.08], [0.28, -0.42], [-0.28, -0.22],
    ];
    return (
        <group
            position={[7.36, 1.58, -16.75]}
            rotation={[0, -Math.PI / 2, 0]}
            userData={{ interactionId: 'constellation', interactionEnabled: revealed }}
        >
            <mesh castShadow>
                <boxGeometry args={[2.45, 1.9, 0.12]} />
                <meshStandardMaterial color="#0c141c" roughness={0.45} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.075]}>
                <planeGeometry args={[2.15, 1.6]} />
                <meshStandardMaterial
                    color="#081019"
                    emissive="#113d55"
                    emissiveIntensity={revealed ? 0.72 : 0.05}
                    roughness={0.55}
                />
            </mesh>
            <group position={[0, 0, 0.1]} visible={revealed}>
                {points.map(([x, y], index) => (
                    <mesh key={`${x}:${y}`} position={[x, y, 0]}>
                        <sphereGeometry args={[index === 2 ? 0.07 : 0.045, 12, 10]} />
                        <meshBasicMaterial color={discovered ? '#ffd784' : '#8fe4ff'} toneMapped={false} />
                    </mesh>
                ))}
                {points.slice(0, -1).map(([x, y], index) => (
                    <BrassRail
                        key={`line-${x}:${y}`}
                        start={new THREE.Vector3(x, y, -0.01)}
                        end={new THREE.Vector3(points[index + 1][0], points[index + 1][1], -0.01)}
                    />
                ))}
                <HintBeacon active={hinted} color="#8fe4ff" />
            </group>
            <MuseumLabel position={[0, -1.2, 0.1]} size={0.11}>CELESTIAL MAP · ARCHIVE 07</MuseumLabel>
        </group>
    );
};

const PowerCellClue = ({ discovered, flashlightOn, hinted }) => {
    const coreRef = useRef();
    const revealed = flashlightOn || discovered;
    useFrame((state) => {
        if (!coreRef.current || !revealed) return;
        coreRef.current.rotation.y = state.clock.elapsedTime * 0.8;
        coreRef.current.scale.y = 0.92 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    });
    return (
        <group
            position={[0.05, -0.12, -13.66]}
            userData={{ interactionId: 'power-cell', interactionEnabled: revealed }}
        >
            <mesh castShadow>
                <boxGeometry args={[1.1, 0.46, 0.72]} />
                <meshStandardMaterial color="#111719" metalness={0.76} roughness={0.34} />
            </mesh>
            <group ref={coreRef} position={[0, 0.03, 0.38]} visible={revealed}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.18, 0.18, 0.46, 18]} />
                    <meshPhysicalMaterial
                        color={discovered ? '#ffc35f' : '#67f2c2'}
                        emissive={discovered ? '#c16e16' : '#169b70'}
                        emissiveIntensity={2.8}
                        metalness={0.28}
                        roughness={0.14}
                    />
                </mesh>
                <pointLight color={discovered ? '#ffc35f' : '#67f2c2'} intensity={2.2} distance={2.7} />
                <HintBeacon active={hinted} color="#67f2c2" />
            </group>
        </group>
    );
};

const BrokenWatch = () => (
    <group
        position={[4.8, 0.02, -11.25]}
        userData={{ interactionId: 'broken-watch', interactionEnabled: true }}
    >
        <DisplayPlinth position={[0, 0, 0]} width={1.55} depth={1.45} label="TIMEKEEPER · INCOMPLETE">
            <group position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0.18, 0.3]}>
                <mesh castShadow>
                    <cylinderGeometry args={[0.42, 0.42, 0.12, 28]} />
                    <meshStandardMaterial color="#8b6a39" metalness={0.82} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.066, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.32, 28]} />
                    <meshStandardMaterial color="#d4c9a9" roughness={0.6} />
                </mesh>
                <BrassRail start={new THREE.Vector3(0, 0.08, 0)} end={new THREE.Vector3(0.17, 0.08, 0.14)} />
                <BrassRail start={new THREE.Vector3(0, 0.08, 0)} end={new THREE.Vector3(-0.05, 0.08, -0.22)} />
            </group>
            <GlassCase width={1.5} depth={1.4} />
        </DisplayPlinth>
    </group>
);

const GlassKey = () => (
    <group
        position={[4.78, 0.02, -20.35]}
        userData={{ interactionId: 'glass-key', interactionEnabled: true }}
    >
        <DisplayPlinth position={[0, 0, 0]} width={1.65} depth={1.45} label="CEREMONIAL KEY · REPLICA">
            <group position={[0, 1.25, 0]} rotation={[0.3, 0.15, -0.35]}>
                <mesh>
                    <torusGeometry args={[0.27, 0.065, 10, 28]} />
                    <meshPhysicalMaterial color="#b9eef1" transmission={0.42} transparent opacity={0.8} roughness={0.05} />
                </mesh>
                <mesh position={[0.54, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.055, 0.055, 0.72, 10]} />
                    <meshPhysicalMaterial color="#b9eef1" transmission={0.42} transparent opacity={0.8} roughness={0.05} />
                </mesh>
                <mesh position={[0.82, -0.13, 0]}>
                    <boxGeometry args={[0.2, 0.34, 0.12]} />
                    <meshPhysicalMaterial color="#b9eef1" transmission={0.42} transparent opacity={0.8} roughness={0.05} />
                </mesh>
            </group>
            <GlassCase width={1.6} depth={1.4} />
        </DisplayPlinth>
    </group>
);

const EmptyFrame = () => (
    <group
        position={[-7.36, 1.55, -20.8]}
        rotation={[0, Math.PI / 2, 0]}
        userData={{ interactionId: 'empty-frame', interactionEnabled: true }}
    >
        <mesh castShadow>
            <boxGeometry args={[2.35, 1.85, 0.12]} />
            <meshStandardMaterial color="#8b7040" metalness={0.65} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[1.88, 1.38, 0.12]} />
            <meshStandardMaterial color="#121719" roughness={0.75} />
        </mesh>
        <MuseumLabel position={[0, -1.18, 0.09]} size={0.11}>UNTITLED · OBJECT REMOVED</MuseumLabel>
    </group>
);

const ArchiveDesk = () => (
    <group position={[0, 0, -12.78]}>
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.35, 1.15, 2.2]} />
            <meshStandardMaterial color="#1d2224" metalness={0.22} roughness={0.58} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.55, 0.14, 2.34]} />
            <meshStandardMaterial color="#725538" roughness={0.46} metalness={0.08} />
        </mesh>
        {[-1.55, 0, 1.55].map((x) => (
            <mesh key={x} position={[x, 0.25, 1.11]}>
                <boxGeometry args={[0.95, 0.38, 0.04]} />
                <meshStandardMaterial color="#111516" metalness={0.55} roughness={0.4} />
            </mesh>
        ))}
        <MuseumLabel position={[0, 0.8, 1.19]} size={0.12}>NIGHT ARCHIVE · AUTHORIZED STAFF</MuseumLabel>
        <group position={[-1.05, 0.82, 0.08]} rotation={[-0.04, 0.2, -0.02]}>
            <mesh castShadow>
                <boxGeometry args={[1.25, 0.045, 0.84]} />
                <meshStandardMaterial color="#c4b18b" roughness={0.84} />
            </mesh>
            <MuseumLabel position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} color="#493e31" size={0.085}>LIGHT REVEALS THE TRUE RECORD</MuseumLabel>
        </group>
    </group>
);

const Vault = ({ complete, hinted }) => {
    const doorPivotRef = useRef();
    const lockRef = useRef();
    useFrame((state, delta) => {
        if (doorPivotRef.current) {
            doorPivotRef.current.rotation.y = THREE.MathUtils.damp(
                doorPivotRef.current.rotation.y,
                complete ? -1.42 : 0,
                complete ? 2.2 : 5,
                delta,
            );
        }
        if (lockRef.current) {
            lockRef.current.rotation.z += delta * (complete ? 0.12 : 0.35);
        }
    });

    return (
        <group
            position={[0, 1.48, -28.25]}
            userData={{ interactionId: 'vault', interactionEnabled: true }}
        >
            <mesh position={[0, 0, 0.16]} castShadow receiveShadow>
                <boxGeometry args={[5.15, 4.1, 0.95]} />
                <meshStandardMaterial color="#14191b" metalness={0.7} roughness={0.32} />
            </mesh>
            <group ref={doorPivotRef} position={[-1.72, 0, 0.72]}>
                <group position={[1.72, 0, 0]}>
                    <mesh castShadow>
                        <cylinderGeometry args={[1.66, 1.66, 0.36, 48]} />
                        <meshStandardMaterial color="#333b3d" metalness={0.86} roughness={0.26} />
                    </mesh>
                    <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[1.29, 0.105, 12, 48]} />
                        <meshStandardMaterial color="#a78a52" metalness={0.9} roughness={0.22} />
                    </mesh>
                    <group ref={lockRef} position={[0, 0, 0.4]}>
                        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
                            <mesh key={angle} position={[Math.cos(angle) * 0.58, Math.sin(angle) * 0.58, 0]} rotation={[0, 0, angle]}>
                                <boxGeometry args={[0.78, 0.085, 0.085]} />
                                <meshStandardMaterial color="#b5985c" metalness={0.92} roughness={0.2} />
                            </mesh>
                        ))}
                        <mesh>
                            <cylinderGeometry args={[0.2, 0.2, 0.2, 24]} />
                            <meshStandardMaterial color="#b5985c" metalness={0.92} roughness={0.2} />
                        </mesh>
                    </group>
                    <HintBeacon active={hinted} />
                </group>
            </group>
            <group position={[0, 0, -0.38]} visible={complete}>
                <pointLight color="#ffd176" intensity={8} distance={9} decay={1.6} />
                <mesh position={[0, 0.15, 0]}>
                    <icosahedronGeometry args={[0.58, 1]} />
                    <meshPhysicalMaterial color="#ffd173" emissive="#da7a21" emissiveIntensity={3.8} metalness={0.42} roughness={0.12} />
                </mesh>
                <Sparkles count={54} scale={[4, 3.2, 2]} size={3.5} speed={0.45} color="#ffd98a" />
            </group>
            <MuseumLabel position={[0, -2.38, 0.7]} size={0.17} color="#d4bd87">COLLECTION VAULT · 04</MuseumLabel>
        </group>
    );
};

const MuseumShell = ({ floorTexture, plasterTexture }) => (
    <group>
        <mesh position={[0, -0.58, -15.2]} receiveShadow>
            <boxGeometry args={[15.2, 0.18, 27.5]} />
            <meshStandardMaterial map={floorTexture} color="#a69580" roughness={0.62} metalness={0.04} />
        </mesh>
        <mesh position={[-7.52, 1.8, -15.2]} receiveShadow>
            <boxGeometry args={[0.18, 4.9, 27.5]} />
            <meshStandardMaterial map={plasterTexture} color="#8d9492" roughness={0.96} />
        </mesh>
        <mesh position={[7.52, 1.8, -15.2]} receiveShadow>
            <boxGeometry args={[0.18, 4.9, 27.5]} />
            <meshStandardMaterial map={plasterTexture} color="#8d9492" roughness={0.96} />
        </mesh>
        <mesh position={[0, 1.8, -29]} receiveShadow>
            <boxGeometry args={[15.2, 4.9, 0.2]} />
            <meshStandardMaterial map={plasterTexture} color="#777f7e" roughness={0.96} />
        </mesh>
        <mesh position={[0, 4.25, -15.2]} receiveShadow>
            <boxGeometry args={[15.2, 0.18, 27.5]} />
            <meshStandardMaterial color="#161b1d" roughness={0.92} />
        </mesh>

        {[-6.9, 6.9].map((x) => (
            <group key={x}>
                {[-5.8, -13.8, -21.8, -27].map((z) => (
                    <group key={z} position={[x, 1.68, z]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.52, 4.45, 0.52]} />
                            <meshStandardMaterial color="#252b2c" roughness={0.7} metalness={0.18} />
                        </mesh>
                        <mesh position={[0, 2.12, 0]}>
                            <boxGeometry args={[0.82, 0.18, 0.82]} />
                            <meshStandardMaterial color="#9b8050" metalness={0.72} roughness={0.3} />
                        </mesh>
                    </group>
                ))}
            </group>
        ))}

        {[-6.4, -1.8, 2.8].map((z, index) => (
            <group key={z} position={[0, 4.02, z]}>
                <mesh castShadow>
                    <boxGeometry args={[13.7, 0.18, 0.24]} />
                    <meshStandardMaterial color="#8d7348" metalness={0.62} roughness={0.32} />
                </mesh>
                <spotLight
                    position={[-4.65, -0.18, 0]}
                    target-position={[-4.65, -3.1, -0.7]}
                    color={index === 1 ? '#b9e8ff' : '#ffd6a3'}
                    intensity={34}
                    angle={0.42}
                    penumbra={0.7}
                    distance={8}
                    decay={1.8}
                    castShadow={index === 0}
                />
                <spotLight
                    position={[4.65, -0.18, 0]}
                    target-position={[4.65, -3.1, -0.7]}
                    color={index === 2 ? '#a7f3df' : '#ffd6a3'}
                    intensity={30}
                    angle={0.42}
                    penumbra={0.72}
                    distance={8}
                    decay={1.8}
                />
            </group>
        ))}

        <mesh position={[0, 0.01, -5.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.65, 1.72, 64]} />
            <meshBasicMaterial color="#9f8654" transparent opacity={0.52} />
        </mesh>
        <MuseumLabel position={[0, 2.85, -28.82]} size={0.27} color="#bca574">XM · NIGHT ARCHIVE</MuseumLabel>
        <MuseumLabel position={[0, 2.48, -28.81]} size={0.1} color="#687477">LIGHT / ORDER / MEMORY</MuseumLabel>
    </group>
);

const isColliding = (x, z) => {
    if (x < -6.72 || x > 6.72 || z > -2.4 || z < -27.15) return true;
    return OBSTACLES.some((obstacle) => (
        x + PLAYER_RADIUS > obstacle.minX &&
        x - PLAYER_RADIUS < obstacle.maxX &&
        z + PLAYER_RADIUS > obstacle.minZ &&
        z - PLAYER_RADIUS < obstacle.maxZ
    ));
};

const TreasureRoom = ({ onReady, isExiting }) => {
    const roomRef = useRef();
    const readyFramesRef = useRef(0);
    const readySentRef = useRef(false);
    const playerRef = useRef(PLAYER_START.clone());
    const yawRef = useRef(0);
    const pitchRef = useRef(-0.02);
    const keysRef = useRef(new Set());
    const focusedRef = useRef(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const localPositionRef = useRef(new THREE.Vector3());
    const worldPositionRef = useRef(new THREE.Vector3());
    const rootQuaternionRef = useRef(new THREE.Quaternion());
    const localQuaternionRef = useRef(new THREE.Quaternion());
    const worldQuaternionRef = useRef(new THREE.Quaternion());
    const directionRef = useRef(new THREE.Vector3());
    const rightRef = useRef(new THREE.Vector3());
    const flashlightDirectionRef = useRef(new THREE.Vector3());
    const { camera, gl, scene } = useThree();
    const { currentRoom } = useScene();
    const {
        battery,
        clueStep,
        controlsRef,
        discoveredIds,
        flashlightOn,
        hintTargetId,
        interactFocused,
        runId,
        setFocusId,
        status,
        toggleFlashlight,
    } = useTreasureHunt();

    const textures = useMemo(() => ({
        floor: createParquetTexture(),
        plaster: createPlasterTexture(),
    }), []);
    const flashlight = useMemo(() => {
        const light = new THREE.SpotLight('#e3f2ff', 0, 22, 0.46, 0.58, 1.45);
        light.castShadow = false;
        return light;
    }, []);
    const active = currentRoom === 'treasure' && !isExiting;

    const resetPlayer = useCallback(() => {
        playerRef.current.copy(PLAYER_START);
        yawRef.current = 0;
        pitchRef.current = -0.02;
        keysRef.current.clear();
        focusedRef.current = null;
        setFocusId(null);
    }, [setFocusId]);

    useEffect(() => () => {
        textures.floor.dispose();
        textures.plaster.dispose();
    }, [textures]);

    useEffect(() => {
        scene.add(flashlight);
        scene.add(flashlight.target);
        return () => {
            scene.remove(flashlight);
            scene.remove(flashlight.target);
            flashlight.dispose();
        };
    }, [flashlight, scene]);

    useEffect(() => {
        if (!active) {
            flashlight.intensity = 0;
            return undefined;
        }
        const previousBackground = scene.background;
        const previousFog = scene.fog;
        const previousFov = camera.fov;
        scene.background = new THREE.Color('#070b0d');
        scene.fog = new THREE.FogExp2('#090e11', 0.032);
        camera.fov = 64;
        camera.updateProjectionMatrix();
        return () => {
            scene.background = previousBackground;
            scene.fog = previousFog;
            camera.fov = previousFov;
            camera.updateProjectionMatrix();
        };
    }, [active, camera, flashlight, scene]);

    useEffect(() => {
        if (currentRoom === 'treasure') resetPlayer();
    }, [currentRoom, resetPlayer, runId]);

    useEffect(() => {
        if (!active || status !== 'running') return undefined;
        const canvas = gl.domElement;
        const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
        let dragging = false;
        let lastX = 0;
        let lastY = 0;

        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
                event.preventDefault();
                keysRef.current.add(key);
            }
            if (key === 'e') interactFocused();
            if (key === 'f') toggleFlashlight();
        };
        const handleKeyUp = (event) => keysRef.current.delete(event.key.toLowerCase());
        const handleMouseMove = (event) => {
            if (document.pointerLockElement === canvas) {
                yawRef.current -= event.movementX * 0.00215;
                pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - event.movementY * 0.00185, -1.02, 1.02);
            } else if (dragging) {
                yawRef.current -= (event.clientX - lastX) * 0.004;
                pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - (event.clientY - lastY) * 0.0033, -1.02, 1.02);
                lastX = event.clientX;
                lastY = event.clientY;
            }
        };
        const handlePointerDown = (event) => {
            if (event.button !== 0 || !hasFinePointer) return;
            if (focusedRef.current) {
                interactFocused();
                return;
            }
            if (document.pointerLockElement !== canvas) {
                if (window.self === window.top) {
                    const lockRequest = canvas.requestPointerLock?.();
                    lockRequest?.catch?.(() => {
                        // Drag-look remains available if the browser rejects pointer lock.
                    });
                }
                dragging = true;
                lastX = event.clientX;
                lastY = event.clientY;
            }
        };
        const stopDragging = () => { dragging = false; };

        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopDragging);
        canvas.addEventListener('mousedown', handlePointerDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', stopDragging);
            canvas.removeEventListener('mousedown', handlePointerDown);
            keysRef.current.clear();
            if (document.pointerLockElement === canvas) document.exitPointerLock?.();
        };
    }, [active, gl, interactFocused, status, toggleFlashlight]);

    useFrame((state, delta) => {
        if (!readySentRef.current) {
            readyFramesRef.current += 1;
            if (readyFramesRef.current >= 4) {
                readySentRef.current = true;
                onReady?.();
            }
        }

        flashlight.intensity = THREE.MathUtils.damp(
            flashlight.intensity,
            active && status === 'running' && flashlightOn ? 78 + battery * 0.16 : 0,
            8,
            delta,
        );

        if (!active || !roomRef.current) return;

        const mobileLookX = controlsRef.current.lookX;
        const mobileLookY = controlsRef.current.lookY;
        if (mobileLookX || mobileLookY) {
            yawRef.current -= mobileLookX * 0.005;
            pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - mobileLookY * 0.0044, -1.02, 1.02);
            controlsRef.current.lookX = 0;
            controlsRef.current.lookY = 0;
        }

        if (status === 'running') {
            const keys = keysRef.current;
            const forwardInput = (
                (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
                (keys.has('s') || keys.has('arrowdown') ? 1 : 0) +
                controlsRef.current.moveY
            );
            const rightInput = (
                (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
                (keys.has('a') || keys.has('arrowleft') ? 1 : 0) +
                controlsRef.current.moveX
            );
            const inputLength = Math.hypot(forwardInput, rightInput);
            if (inputLength > 0.025) {
                const normalizedForward = forwardInput / Math.max(1, inputLength);
                const normalizedRight = rightInput / Math.max(1, inputLength);
                directionRef.current.set(Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
                rightRef.current.set(Math.cos(yawRef.current), 0, Math.sin(yawRef.current));
                const sprinting = keys.has('shift') || controlsRef.current.sprint;
                const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
                const stepX = (
                    directionRef.current.x * normalizedForward + rightRef.current.x * normalizedRight
                ) * speed * Math.min(delta, 0.05);
                const stepZ = (
                    directionRef.current.z * normalizedForward + rightRef.current.z * normalizedRight
                ) * speed * Math.min(delta, 0.05);
                const nextX = playerRef.current.x + stepX;
                if (!isColliding(nextX, playerRef.current.z)) playerRef.current.x = nextX;
                const nextZ = playerRef.current.z + stepZ;
                if (!isColliding(playerRef.current.x, nextZ)) playerRef.current.z = nextZ;
            }
        }

        const walking = (
            keysRef.current.has('w') || keysRef.current.has('a') || keysRef.current.has('s') || keysRef.current.has('d') ||
            Math.abs(controlsRef.current.moveX) > 0.08 || Math.abs(controlsRef.current.moveY) > 0.08
        );
        const bob = walking && status === 'running' ? Math.sin(state.clock.elapsedTime * 10) * 0.018 : 0;
        localPositionRef.current.copy(playerRef.current);
        localPositionRef.current.y = PLAYER_START.y + bob;
        worldPositionRef.current.copy(localPositionRef.current);
        roomRef.current.localToWorld(worldPositionRef.current);
        roomRef.current.getWorldQuaternion(rootQuaternionRef.current);
        localQuaternionRef.current.setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'));
        worldQuaternionRef.current.copy(rootQuaternionRef.current).multiply(localQuaternionRef.current);
        camera.position.copy(worldPositionRef.current);
        camera.quaternion.copy(worldQuaternionRef.current);
        camera.updateMatrixWorld();
        camera.getWorldDirection(flashlightDirectionRef.current);
        flashlight.position.copy(camera.position).addScaledVector(flashlightDirectionRef.current, 0.08);
        flashlight.target.position.copy(camera.position).addScaledVector(flashlightDirectionRef.current, 6);
        flashlight.updateMatrixWorld();
        flashlight.target.updateMatrixWorld();

        raycasterRef.current.setFromCamera({ x: 0, y: 0 }, camera);
        raycasterRef.current.far = INTERACTION_DISTANCE;
        const intersections = raycasterRef.current.intersectObject(roomRef.current, true);
        let nextFocusId = null;
        for (const intersection of intersections) {
            let object = intersection.object;
            while (object && object !== roomRef.current) {
                if (object.userData?.interactionId) {
                    if (object.userData.interactionEnabled) nextFocusId = object.userData.interactionId;
                    break;
                }
                object = object.parent;
            }
            if (nextFocusId || !intersection.object.userData?.raycastIgnore) break;
        }
        if (focusedRef.current !== nextFocusId) {
            focusedRef.current = nextFocusId;
            setFocusId(nextFocusId);
        }
    });

    return (
        <group ref={roomRef}>
            <MuseumShell floorTexture={textures.floor} plasterTexture={textures.plaster} />
            <hemisphereLight args={['#7892a0', '#17100b', 0.82]} />
            <ambientLight intensity={0.32} color="#8aa6ac" />
            <pointLight position={[0, 3.2, -6]} color="#b9dcdf" intensity={28} distance={13} decay={1.65} />
            <pointLight position={[0, 2.8, -23]} color="#cf9a61" intensity={24} distance={11} decay={1.7} />
            <ArchiveDesk />
            <PrismClue
                discovered={discoveredIds.has('prism')}
                flashlightOn={flashlightOn}
                hinted={hintTargetId === 'prism'}
            />
            <ConstellationClue
                discovered={discoveredIds.has('constellation')}
                flashlightOn={flashlightOn}
                hinted={hintTargetId === 'constellation'}
            />
            <PowerCellClue
                discovered={discoveredIds.has('power-cell')}
                flashlightOn={flashlightOn}
                hinted={hintTargetId === 'power-cell'}
            />
            <BrokenWatch />
            <GlassKey />
            <EmptyFrame />
            <Vault complete={status === 'completed'} hinted={hintTargetId === 'vault'} clueStep={clueStep} />
            <Sparkles count={72} scale={[13, 4, 24]} position={[0, 1.6, -15]} size={1.2} speed={0.08} color="#95a7a4" opacity={0.28} />
        </group>
    );
};

export default memo(TreasureRoom);
