import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Compile the entrance and corridor shaders after their first few frames.
 * The original portfolio rooms are intentionally not mounted: Theme Four now
 * uses the lightweight XM-Games room shell and DOM catalog instead.
 */
const RoomWarmup = ({ onWarmupComplete, isLowTier }) => {
    const [isDone, setIsDone] = useState(false);
    const frameCount = useRef(0);
    const completeFired = useRef(false);
    const { gl, scene, camera } = useThree();

    useFrame(() => {
        if (isDone || completeFired.current) return;

        frameCount.current += 1;
        const targetFrames = isLowTier ? 1 : 3;
        if (frameCount.current < targetFrames) return;

        completeFired.current = true;

        const finishWarmup = () => {
            requestAnimationFrame(() => {
                setIsDone(true);
                onWarmupComplete?.();
            });
        };

        if (isLowTier) {
            finishWarmup();
            return;
        }

        if (gl.compileAsync) {
            gl.compileAsync(scene, camera, scene)
                .then(finishWarmup)
                .catch(() => {
                    gl.compile(scene, camera);
                    finishWarmup();
                });
        } else {
            gl.compile(scene, camera);
            finishWarmup();
        }
    });

    return null;
};

export default RoomWarmup;
