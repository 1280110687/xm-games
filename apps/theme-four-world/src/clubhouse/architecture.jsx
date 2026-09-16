import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CLUBHOUSE_ROOM_NAMES } from '@xm-games/experience-bridge';
import { Box, Label, Plant, Plaque, Sconce, useMaterials } from './materials';
import { COPY, ROOM_DOORS } from './model';

function Floor({ position, width, depth }) {
    const mesh = useRef();
    const materials = useMaterials();
    const cols = Math.ceil(width / 0.42);
    const rows = Math.ceil(depth / 1.6);
    useLayoutEffect(() => {
        const dummy = new THREE.Object3D();
        for (let x = 0; x < cols; x++) for (let z = 0; z < rows; z++) {
            dummy.position.set((x + 0.5) * width / cols - width / 2, 0, (z + 0.5) * depth / rows - depth / 2);
            dummy.scale.set(width / cols - 0.006, 0.06, depth / rows - 0.008);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(x * rows + z, dummy.matrix);
            mesh.current.setColorAt(x * rows + z, new THREE.Color().setScalar(0.85 + ((x * 13 + z * 7) % 10) * 0.018));
        }
        mesh.current.instanceMatrix.needsUpdate = true;
        mesh.current.instanceColor.needsUpdate = true;
    }, [cols, rows, width, depth]);
    return <instancedMesh ref={mesh} args={[null, null, cols * rows]} position={position} material={materials.wood} receiveShadow><boxGeometry args={[1, 1, 1]} /></instancedMesh>;
}

export function HingedDoor({ position, rotation = 0, width = 1.65, height = 2.95, id, label, apiRef, entrance = false, leftLeaf = false }) {
    const pivot = useRef();
    const materials = useMaterials();
    const sign = leftLeaf ? -1 : 1;
    useFrame((_, delta) => {
        if (!pivot.current) return;
        const value = apiRef.current?.state.doors[id] || 0;
        const direct = id === 'entrance' && apiRef.current?.state.push;
        const goal = sign * value * 1.48;
        pivot.current.rotation.y = direct ? goal : THREE.MathUtils.damp(pivot.current.rotation.y, goal, 8, Math.min(delta, 0.05));
    });
    const activate = (event) => {
        event.stopPropagation();
        const api = apiRef.current;
        if (!api?.canActivate()) return;
        if (entrance) { if (api.state.place === 'corridor') api.back(); else api.enter(); }
        else if (api.state.place === id) api.back();
        else if (api.state.place === 'corridor') api.visit(id);
    };
    return <group position={position} rotation={[0, rotation, 0]}>
        <group ref={pivot} position={[-sign * width / 2, 0, 0]}>
            <group position={[sign * width / 2, height / 2, 0]} onClick={activate} onPointerDown={entrance ? (event) => apiRef.current?.beginPush(event) : undefined}>
                {!entrance && <Box size={[width, height, 0.12]} material="teal" />}
                {entrance && <>
                    <Box position={[0, -height * 0.28, 0]} size={[width, height * 0.44, 0.12]} material="teal" />
                    {[-1, 1].map((side) => <Box key={side} position={[side * (width / 2 - 0.07), height * 0.15, 0]} size={[0.14, height * 0.7, 0.12]} material="teal" />)}
                    <Box position={[0, height / 2 - 0.065, 0]} size={[width, 0.13, 0.12]} material="teal" />
                    <Box position={[0, -height * 0.05, 0]} size={[width, 0.13, 0.12]} material="teal" />
                </>}
                <Box position={[0, -height * 0.28, 0.071]} size={[width - 0.22, height * 0.29, 0.07]} material="tealInset" />
                <Box position={[0, -height * 0.28, -0.071]} size={[width - 0.22, height * 0.29, 0.07]} material="tealInset" />
                {!entrance && <Box position={[0, height * 0.2, 0.07]} size={[width - 0.22, height * 0.48, 0.055]} material="tealInset" />}
                {entrance && <Box position={[0, height * 0.2, 0]} size={[width - 0.28, height * 0.46, 0.014]} material="glass" castShadow={false} />}
                <Box position={[sign * (width / 2 - 0.18), -0.16, 0.096]} size={[0.09, 0.38, 0.03]} material="brass" rounded />
                <Box position={[sign * (width / 2 - 0.25), -0.11, 0.19]} size={[0.27, 0.04, 0.05]} material="brass" rounded />
                <Box position={[sign * (width / 2 - 0.25), -0.11, -0.19]} size={[0.27, 0.04, 0.05]} material="brass" rounded />
                {[-0.9, 0.85].map((y) => <mesh key={y} position={[-sign * width / 2, y, 0]} material={materials.brass}><cylinderGeometry args={[0.025, 0.025, 0.16, 10]} /></mesh>)}
                {label && <Plaque text={label} position={[0, 0.48, 0.16]} width={width * 0.87} height={0.5} />}
                {/* One generous physical hit target, including handle and panel. */}
                <mesh visible={false}><boxGeometry args={[width, height, 0.45]} /><meshBasicMaterial /></mesh>
            </group>
        </group>
    </group>;
}

export function DoorFrame({ position, rotation = 0, width = 1.65, height = 2.95 }) {
    return <group position={position} rotation={[0, rotation, 0]}>
        {[-1, 1].map((side) => <Box key={side} position={[side * (width / 2 + 0.1), height / 2, 0]} size={[0.18, height + 0.18, 0.35]} rounded />)}
        <Box position={[0, height + 0.07, 0]} size={[width + 0.38, 0.2, 0.35]} rounded />
    </group>;
}

function Window({ position, width = 3.3, height = 2.4, rotation = 0 }) {
    return <group position={position} rotation={[0, rotation, 0]}>
        <Box size={[width + 0.22, height + 0.22, 0.18]} material="wood" />
        <mesh position={[0, 0, 0.11]}><planeGeometry args={[width, height]} /><meshBasicMaterial color="#d4e7eb" toneMapped={false} /></mesh>
        {[-1, 0, 1].map((i) => <Box key={i} position={[i * width / 2, 0, 0.15]} size={[0.065, height, 0.12]} material="teal" />)}
        {[-1, 0, 1].map((i) => <Box key={i} position={[0, i * height / 2, 0.15]} size={[width, 0.065, 0.12]} material="teal" />)}
        <Box position={[0, -height / 2 - 0.06, 0.15]} size={[width + 0.3, 0.1, 0.44]} />
    </group>;
}

function RoomShell({ x, title }) {
    return <group>
        <Floor position={[x, -0.03, -1.7]} width={6.4} depth={8.4} />
        <Box position={[x, 2.25, -6]} size={[6.5, 4.5, 0.22]} material="plaster" />
        <Box position={[x + Math.sign(x) * 3.2, 2.25, -1.7]} size={[0.22, 4.5, 8.5]} material="plaster" />
        <Box position={[x, 2.25, 2.6]} size={[6.5, 4.5, 0.22]} material="plaster" />
        <Box position={[x, 4.5, -1.7]} size={[6.5, 0.16, 8.5]} material="plaster" />
        <Window position={[x + 0.5, 2.4, -5.87]} />
        <Label text={title} position={[x - 2, 2.95, -5.85]} width={1.5} height={0.7} size={230} />
        <Plant position={[x + 2.35, 0, -4.9]} scale={1.45} />
        <Box position={[x, 3.97, -5.8]} size={[6.1, 0.045, 0.06]} material="glow" />
    </group>;
}

export default function Architecture({ apiRef, locale }) {
    const materials = useMaterials();
    const copy = COPY[locale];
    const names = CLUBHOUSE_ROOM_NAMES[locale];
    return <group>
        <Floor position={[0, -0.035, -3.5]} width={6} depth={15} />
        <Box position={[0, -0.08, 9]} size={[16, 0.13, 10]} material="stone" />
        {/* Facade surrounds the real opening; the camera passes through it. */}
        {[-1, 1].map((side) => <Box key={side} position={[side * 4.1, 4, 4]} size={[5.2, 8, 0.32]} material="plaster" />)}
        <Box position={[0, 5.65, 4]} size={[3.05, 4.7, 0.32]} material="plaster" />
        <DoorFrame position={[0, 0, 4.15]} width={2.8} height={3.25} />
        <HingedDoor position={[-0.7, 0, 4.18]} width={1.4} height={3.25} id="entrance" apiRef={apiRef} entrance />
        <HingedDoor position={[0.7, 0, 4.18]} width={1.4} height={3.25} id="entrance" apiRef={apiRef} entrance leftLeaf />
        <Plaque text={copy.clubhouse} position={[0, 3.89, 4.23]} width={2.8} height={0.64} />
        <Label text="XM · GAMES" position={[0, 4.45, 4.19]} width={1.4} height={0.16} size={75} color="#736c59" />
        {[-1, 1].map((side) => <group key={side}>
            <Sconce position={[side * 1.92, 2.55, 4.2]} />
            <Plant position={[side * 2.08, 0, 4.8]} scale={1.55} />
            {/* Side walls leave door apertures at z=-2. */}
            <Box position={[side * 3.12, 2.25, 1.49]} size={[0.24, 4.5, 4.85]} material="plaster" />
            <Box position={[side * 3.12, 2.25, -7.05]} size={[0.24, 4.5, 8.1]} material="plaster" />
            <Box position={[side * 3.12, 3.78, -2]} size={[0.24, 1.44, 2.18]} material="plaster" />
            <Box position={[side * 2.95, 0.12, -7.1]} size={[0.08, 0.24, 7.8]} />
            <Box position={[side * 2.85, 4.25, -3.5]} size={[0.3, 0.2, 15]} material="plaster" />
            <Box position={[side * 2.7, 4.1, -3.5]} size={[0.04, 0.04, 14.5]} material="glow" />
            {[-5.2, -8.4].map((z) => <Sconce key={z} position={[side * 2.92, 2.5, z]} rotation={[0, -side * Math.PI / 2, 0]} />)}
            <Plant position={[side * 2.43, 0, -9.4]} />
            <Box position={[side * 2.48, 0.52, -6.8]} size={[0.58, 0.16, 2.0]} rounded />
            <Box position={[side * 2.48, 0.65, -6.8]} size={[0.55, 0.14, 1.94]} material="paper" rounded />
            {[-1, 1].map((leg) => <Box key={leg} position={[side * 2.48, 0.25, -6.8 + leg * 0.8]} size={[0.43, 0.5, 0.1]} />)}
        </group>)}
        {/* Skylight stays open to the sky, with real shadow-casting beams. */}
        {[-1, 1].map((side) => <Box key={side} position={[side * 2.1, 4.5, -3.5]} size={[1.8, 0.25, 15]} material="plaster" />)}
        {[-9.2, -6, -2.8, 0.4, 3.4].map((z) => <Box key={z} position={[0, 4.56, z]} size={[2.8, 0.09, 0.12]} material="dark" />)}
        <Box position={[0, 3.9, -11.16]} size={[6.5, 1.2, 0.3]} material="plaster" />
        {[-3, 0, 3].map((x) => <Box key={x} position={[x, 1.7, -11.16]} size={[0.75, 3.4, 0.3]} material="plaster" />)}
        {Object.entries(ROOM_DOORS).map(([id, door]) => <group key={id}>
            <DoorFrame position={door.position} rotation={door.rotation} />
            <HingedDoor position={door.position} rotation={door.rotation} id={id} label={names[id]} apiRef={apiRef} />
        </group>)}
        <RoomShell x={6.3} title={copy.workshop} />
        <RoomShell x={-6.3} title={names.gallery} />
        {/* Rear vestibules indicate the existing, separately loaded experiences. */}
        <Box position={[-1.5, 1.5, -13]} size={[2.2, 3, 0.1]} material="dark" />
        <mesh position={[-1.5, 1.2, -12.3]}><octahedronGeometry args={[0.42]} /><meshStandardMaterial color="#89dfe8" emissive="#4caec5" emissiveIntensity={0.5} metalness={0.3} roughness={0.2} /></mesh>
        <Box position={[-1.5, 0.35, -12.3]} size={[0.8, 0.7, 0.8]} material="stone" />
        <Box position={[1.5, 1.5, -13]} size={[2.2, 3, 0.1]} material="dark" />
        <Box position={[1.5, 0.6, -12.3]} size={[0.9, 1.2, 0.9]} material="wood" />
        <mesh position={[1.5, 1.42, -12.3]} material={materials.brass}><sphereGeometry args={[0.32, 20, 12]} /></mesh>
    </group>;
}
