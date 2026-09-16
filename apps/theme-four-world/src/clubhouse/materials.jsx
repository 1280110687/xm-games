import { createContext, useContext, useEffect, useMemo } from 'react';
import { useTexture, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const Materials = createContext(null);
export const useMaterials = () => useContext(Materials);

export function ClubMaterials({ children }) {
    const [woodMap, plasterMap] = useTexture([
        '/theme-four-experience/textures/clubhouse/pale-oak.webp',
        '/theme-four-experience/textures/clubhouse/ivory-plaster.webp',
    ]);
    const materials = useMemo(() => {
        for (const map of [woodMap, plasterMap]) {
            map.colorSpace = THREE.SRGBColorSpace;
            map.wrapS = map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
        }
        return {
            wood: new THREE.MeshStandardMaterial({ map: woodMap, color: '#fff9ef', roughness: 0.68 }),
            plaster: new THREE.MeshStandardMaterial({ map: plasterMap, color: '#ffffff', roughness: 0.95 }),
            teal: new THREE.MeshStandardMaterial({ color: '#215858', roughness: 0.48, metalness: 0.08 }),
            tealInset: new THREE.MeshStandardMaterial({ color: '#286867', roughness: 0.6 }),
            brass: new THREE.MeshStandardMaterial({ color: '#b79856', roughness: 0.3, metalness: 0.65 }),
            dark: new THREE.MeshStandardMaterial({ color: '#182e31', roughness: 0.5 }),
            paper: new THREE.MeshStandardMaterial({ color: '#fff9e8', roughness: 0.86 }),
            stone: new THREE.MeshStandardMaterial({ map: plasterMap, color: '#cfc9b9', roughness: 0.93 }),
            leaf: new THREE.MeshStandardMaterial({ color: '#49713c', roughness: 0.8 }),
            glass: new THREE.MeshStandardMaterial({ color: '#a7c9cd', transparent: true, opacity: 0.22, roughness: 0.12, metalness: 0.3, depthWrite: false }),
            glow: new THREE.MeshBasicMaterial({ color: '#ffe5b1' }),
        };
    }, [woodMap, plasterMap]);
    useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
    return <Materials.Provider value={materials}>{children}</Materials.Provider>;
}

export function Box({ size, position, rotation, material = 'wood', rounded = false, ...props }) {
    const materials = useMaterials();
    if (rounded) return <RoundedBox args={size} radius={Math.min(0.06, Math.min(...size) / 3)} smoothness={2} position={position} rotation={rotation} material={materials[material]} castShadow receiveShadow {...props} />;
    return <mesh position={position} rotation={rotation} material={materials[material]} castShadow receiveShadow {...props}><boxGeometry args={size} /></mesh>;
}

/** Localized architectural text: no remote font fetch or baked-in locale. */
export function Label({ text, position, rotation, width = 1, height = 0.3, color = '#302b24', background = null, size = 64 }) {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = Math.max(128, Math.round(1024 * height / width));
        const context = canvas.getContext('2d');
        if (background) { context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height); }
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `600 ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans Thai", sans-serif`;
        const lines = text.split('\n');
        lines.forEach((line, index) => context.fillText(line, 512, canvas.height / 2 + (index - (lines.length - 1) / 2) * size * 1.4, 950));
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 4;
        return map;
    }, [text, width, height, size, color, background]);
    useEffect(() => () => texture.dispose(), [texture]);
    return <mesh position={position} rotation={rotation} raycast={() => null}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent={!background} toneMapped={false} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>;
}

export function Plaque({ text, position, rotation, width = 1.35, height = 0.42 }) {
    const materials = useMaterials();
    return <group position={position} rotation={rotation}>
        <Box size={[width, height, 0.07]} rounded />
        <Label text={text} position={[0, 0, 0.041]} width={width * 0.9} height={height * 0.8} size={text.length > 15 ? 90 : 146} />
        {[-1, 1].map((side) => <mesh key={side} position={[side * (width / 2 - 0.07), 0, 0.043]} rotation={[Math.PI / 2, 0, 0]} material={materials.brass}><cylinderGeometry args={[0.014, 0.014, 0.012, 8]} /></mesh>)}
    </group>;
}

export function Plant({ position, scale = 1 }) {
    const materials = useMaterials();
    return <group position={position} scale={scale}>
        <mesh position={[0, 0.29, 0]} material={materials.stone} castShadow receiveShadow><cylinderGeometry args={[0.26, 0.2, 0.58, 16]} /></mesh>
        <mesh position={[0, 0.59, 0]} material={materials.dark}><cylinderGeometry args={[0.23, 0.23, 0.015, 16]} /></mesh>
        <mesh position={[0, 1.04, 0]} material={materials.wood}><cylinderGeometry args={[0.014, 0.03, 0.9, 7]} /></mesh>
        {Array.from({ length: 13 }, (_, i) => {
            const angle = i * 2.4;
            const height = 0.76 + i * 0.057;
            const reach = 0.3 - i * 0.009;
            return <mesh key={i} position={[Math.cos(angle) * reach, height, Math.sin(angle) * reach]} rotation={[0.25, -angle, 0.3 + i * 0.08]} scale={[0.25, 0.045, 0.12]} material={materials.leaf} castShadow><sphereGeometry args={[1, 8, 5]} /></mesh>;
        })}
    </group>;
}

export function Sconce({ position, rotation }) {
    const materials = useMaterials();
    return <group position={position} rotation={rotation}>
        <Box material="brass" size={[0.1, 0.66, 0.1]} />
        <mesh position={[0, 0, 0.07]} material={materials.glow}><cylinderGeometry args={[0.065, 0.065, 0.42, 12]} /></mesh>
    </group>;
}
