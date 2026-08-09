import { memo, useEffect, useMemo } from 'react';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const ROOM_CONFIG = {
    corridorWidth: 2.2,
    corridorHeight: 2.4,
    corridorDepth: 2,
    roomWidth: 30,
    roomHeight: 20,
    roomDepth: 25,
};

const ROOM_TITLES = {
    'THE GALLERY': 'XM-GAMES ARCADE',
    'THE STUDIO': 'LAN LOUNGE',
    'THE ABOUT': 'ABOUT XM-GAMES',
    "LET'S CONNECT": 'OFFLINE TOOLBOX',
};

const ROOM_SUBTITLES = {
    'THE GALLERY': 'PLAY · FOCUS · PUZZLE · ARCADE',
    'THE STUDIO': 'MOBILE FIRST · LOCAL AND LAN',
    'THE ABOUT': 'LIGHTWEIGHT GAMES, BUILT FOR EVERY SCREEN',
    "LET'S CONNECT": 'TEXT · QR · JSON · CRYPTO',
};

const NATURAL_TILE_W = (1582 / 94) * 0.15;

const cloneTiledTexture = (source, repeatX, repeatY) => {
    const texture = source.clone();
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
};

const RoomInterior = memo(({ label, showRoom, onReady }) => {
    const { corridorWidth, corridorHeight, corridorDepth, roomWidth, roomHeight, roomDepth } = ROOM_CONFIG;
    const halfDepth = corridorDepth / 2;
    const roomZ = -corridorDepth - roomDepth / 2;
    const title = ROOM_TITLES[label] || 'XM-GAMES';
    const subtitle = ROOM_SUBTITLES[label] || 'PLAY ANYWHERE';

    const floorTexSrc = useTexture('/theme-four-experience/textures/corridor/kawalekpodlogi.webp');
    const wallTexSrc = useTexture('/theme-four-experience/textures/corridor/wall_texture.webp');
    const ceilingTexSrc = useTexture('/theme-four-experience/textures/corridor/ceiling_texture.webp');
    const bbTexSrc = useTexture('/theme-four-experience/textures/corridor/texturadoprogow.webp');

    const materials = useMemo(() => ({
        corridorFloor: new THREE.MeshBasicMaterial({
            color: '#e0e0e0',
            map: cloneTiledTexture(floorTexSrc, corridorDepth / 2.5, corridorWidth / 2.5),
            side: THREE.DoubleSide,
        }),
        corridorWallL: new THREE.MeshBasicMaterial({
            color: '#e0e0e0',
            map: cloneTiledTexture(wallTexSrc, corridorDepth / 2, corridorHeight / 2),
            side: THREE.DoubleSide,
        }),
        corridorWallR: new THREE.MeshBasicMaterial({
            color: '#e0e0e0',
            map: cloneTiledTexture(wallTexSrc, corridorDepth / 2, corridorHeight / 2),
            side: THREE.DoubleSide,
        }),
        corridorCeiling: new THREE.MeshBasicMaterial({
            color: '#e0e0e0',
            map: cloneTiledTexture(ceilingTexSrc, corridorDepth / 2.5, corridorWidth / 2.5),
            side: THREE.DoubleSide,
        }),
        baseboard: new THREE.MeshBasicMaterial({
            color: '#e0e0e0',
            map: cloneTiledTexture(bbTexSrc, corridorDepth / NATURAL_TILE_W, 1),
            side: THREE.DoubleSide,
        }),
        threshold: new THREE.MeshBasicMaterial({
            color: '#e0e0e0',
            map: cloneTiledTexture(bbTexSrc, corridorWidth / NATURAL_TILE_W, 1),
            side: THREE.DoubleSide,
        }),
        roomFloor: new THREE.MeshBasicMaterial({
            color: '#e6e1d8',
            map: cloneTiledTexture(floorTexSrc, 8, 8),
            side: THREE.DoubleSide,
        }),
        roomCeiling: new THREE.MeshBasicMaterial({ color: '#faf8f2', side: THREE.DoubleSide }),
        roomWall: new THREE.MeshBasicMaterial({
            color: '#f0ede6',
            map: cloneTiledTexture(wallTexSrc, 8, 5),
            side: THREE.DoubleSide,
        }),
    }), [floorTexSrc, wallTexSrc, ceilingTexSrc, bbTexSrc, corridorDepth, corridorWidth, corridorHeight]);

    const geometries = useMemo(() => ({
        corridorSideWall: new THREE.PlaneGeometry(corridorDepth, corridorHeight),
        corridorFloorCeiling: new THREE.PlaneGeometry(corridorWidth, corridorDepth),
        corridorBaseboard: new THREE.PlaneGeometry(corridorDepth, 0.15),
        threshold: new THREE.PlaneGeometry(corridorWidth, 0.15),
        roomFloorCeiling: new THREE.PlaneGeometry(roomWidth, roomDepth),
        roomSideWall: new THREE.PlaneGeometry(roomDepth, roomHeight),
        roomBackWall: new THREE.PlaneGeometry(roomWidth, roomHeight),
    }), [corridorDepth, corridorHeight, corridorWidth, roomDepth, roomHeight, roomWidth]);

    useEffect(() => {
        if (showRoom) onReady?.();
    }, [showRoom, onReady]);

    return (
        <group position={[0, -0.149, 0]}>
            <mesh position={[-corridorWidth / 2, 0, -halfDepth]} rotation={[0, Math.PI / 2, 0]} geometry={geometries.corridorSideWall} material={materials.corridorWallL} />
            <mesh position={[corridorWidth / 2, 0, -halfDepth]} rotation={[0, -Math.PI / 2, 0]} geometry={geometries.corridorSideWall} material={materials.corridorWallR} />
            <mesh position={[0, -corridorHeight / 2, -halfDepth]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometries.corridorFloorCeiling} material={materials.corridorFloor} />
            <mesh position={[0, corridorHeight / 2, -halfDepth]} rotation={[Math.PI / 2, 0, 0]} geometry={geometries.corridorFloorCeiling} material={materials.corridorCeiling} />
            <mesh position={[-corridorWidth / 2 + 0.01, -corridorHeight / 2 + 0.075, -halfDepth]} rotation={[0, Math.PI / 2, 0]} geometry={geometries.corridorBaseboard} material={materials.baseboard} />
            <mesh position={[corridorWidth / 2 - 0.01, -corridorHeight / 2 + 0.075, -halfDepth]} rotation={[0, -Math.PI / 2, 0]} geometry={geometries.corridorBaseboard} material={materials.baseboard} />
            <mesh position={[0, -corridorHeight / 2 + 0.005, -corridorDepth]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometries.threshold} material={materials.threshold} />

            {showRoom && (
                <group position={[0, roomHeight / 2 - corridorHeight / 2, roomZ]}>
                    <mesh position={[0, -roomHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometries.roomFloorCeiling} material={materials.roomFloor} />
                    <mesh position={[0, roomHeight / 2, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geometries.roomFloorCeiling} material={materials.roomCeiling} />
                    <mesh position={[0, 0, -roomDepth / 2]} geometry={geometries.roomBackWall} material={materials.roomWall} />
                    <mesh position={[-roomWidth / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} geometry={geometries.roomSideWall} material={materials.roomWall} />
                    <mesh position={[roomWidth / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={geometries.roomSideWall} material={materials.roomWall} />

                    <Text
                        position={[0, 2, -roomDepth / 2 + 0.08]}
                        font="/theme-four-experience/fonts/CabinSketch-Bold.ttf"
                        fontSize={2.8}
                        color="#25231f"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={roomWidth * 0.82}
                        textAlign="center"
                    >
                        {title}
                    </Text>
                    <Text
                        position={[0, -0.4, -roomDepth / 2 + 0.08]}
                        font="/theme-four-experience/fonts/CabinSketch-Regular.ttf"
                        fontSize={0.62}
                        color="#286f72"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={roomWidth * 0.72}
                        textAlign="center"
                    >
                        {subtitle}
                    </Text>
                </group>
            )}
        </group>
    );
});

RoomInterior.displayName = 'RoomInterior';

export default RoomInterior;
