import { memo, Suspense, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import GalleryRoom from '../rooms/Gallery/GalleryRoom';
import StudioRoom from '../rooms/Studio/StudioRoom';
import AboutRoom from '../rooms/About/AboutRoom';
import ContactRoom from '../rooms/Contact/ContactRoom';
import TreasureRoom from '../rooms/Treasure/TreasureRoom';

const ROOM_CONFIG = {
    corridorWidth: 2.2,
    corridorHeight: 2.4,
    corridorDepth: 2,
    roomWidth: 30,
    roomHeight: 20,
    roomDepth: 25,
};

const NATURAL_TILE_W = (1582 / 94) * 0.15;

const cloneTiledTexture = (source, repeatX, repeatY) => {
    const texture = source.clone();
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
};

const RoomInterior = memo(({ label, showRoom, onReady, isExiting }) => {
    const { corridorWidth, corridorHeight, corridorDepth } = ROOM_CONFIG;
    const halfDepth = corridorDepth / 2;

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
    }), [floorTexSrc, wallTexSrc, ceilingTexSrc, bbTexSrc, corridorDepth, corridorWidth, corridorHeight]);

    const geometries = useMemo(() => ({
        corridorSideWall: new THREE.PlaneGeometry(corridorDepth, corridorHeight),
        corridorFloorCeiling: new THREE.PlaneGeometry(corridorWidth, corridorDepth),
        corridorBaseboard: new THREE.PlaneGeometry(corridorDepth, 0.15),
        threshold: new THREE.PlaneGeometry(corridorWidth, 0.15),
    }), [corridorDepth, corridorHeight, corridorWidth]);

    const roomProps = { showRoom, onReady, isExiting };

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
                <group position={[0, -0.5, -corridorDepth]}>
                    <Suspense fallback={null}>
                        {label === 'THE GALLERY' && <GalleryRoom {...roomProps} />}
                        {label === 'THE STUDIO' && <StudioRoom {...roomProps} />}
                        {label === 'THE ABOUT' && <AboutRoom {...roomProps} />}
                        {label === "LET'S CONNECT" && <ContactRoom {...roomProps} />}
                        {label === 'TREASURE HUNT' && <TreasureRoom {...roomProps} />}
                    </Suspense>
                </group>
            )}
        </group>
    );
});

RoomInterior.displayName = 'RoomInterior';

export default RoomInterior;
