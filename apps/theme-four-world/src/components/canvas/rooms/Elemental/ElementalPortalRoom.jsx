import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ElementalPortalRoom = ({ onReady }) => {
    const portalRef = useRef();
    const coreRef = useRef();
    const readyFramesRef = useRef(0);
    const readySentRef = useRef(false);
    const stars = useMemo(() => {
        const positions = new Float32Array(96 * 3);
        for (let index = 0; index < 96; index += 1) {
            const offset = index * 3;
            positions[offset] = (Math.random() - 0.5) * 14;
            positions[offset + 1] = Math.random() * 7 - 0.8;
            positions[offset + 2] = -3 - Math.random() * 19;
        }
        return positions;
    }, []);

    useFrame((state, delta) => {
        if (!readySentRef.current) {
            readyFramesRef.current += 1;
            if (readyFramesRef.current >= 2) {
                readySentRef.current = true;
                onReady?.();
            }
        }

        if (portalRef.current) portalRef.current.rotation.z += delta * 0.18;
        if (coreRef.current) {
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.08;
            coreRef.current.scale.setScalar(pulse);
        }
    });

    return (
        <group>
            <mesh position={[0, -1.18, -11]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[16, 24]} />
                <meshBasicMaterial color="#060a10" />
            </mesh>
            <mesh position={[0, 3.3, -22]}>
                <planeGeometry args={[16, 9]} />
                <meshBasicMaterial color="#03050a" />
            </mesh>
            <group ref={portalRef} position={[0, 1.6, -10]}>
                <mesh>
                    <torusGeometry args={[3.2, 0.075, 12, 96]} />
                    <meshBasicMaterial color="#77d9ff" transparent opacity={0.88} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                    <torusGeometry args={[2.72, 0.035, 8, 64]} />
                    <meshBasicMaterial color="#af7cff" transparent opacity={0.68} />
                </mesh>
            </group>
            <mesh ref={coreRef} position={[0, 1.6, -10]}>
                <circleGeometry args={[2.42, 64]} />
                <meshBasicMaterial color="#071725" transparent opacity={0.86} side={THREE.DoubleSide} />
            </mesh>
            <points>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[stars, 3]} />
                </bufferGeometry>
                <pointsMaterial color="#86dfff" size={0.045} transparent opacity={0.72} depthWrite={false} />
            </points>
        </group>
    );
};

export default memo(ElementalPortalRoom);
