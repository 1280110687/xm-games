import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Compile the entrance and corridor before dismissing the loader. */
const RoomWarmup = ({ onWarmupComplete, isLowTier }) => {
    const [isDone, setIsDone] = useState(false);
    const frameCount = useRef(0);
    const completeFired = useRef(false);
    const { gl, scene, camera } = useThree();

    useFrame(() => {
        if (isDone || completeFired.current) return;

        frameCount.current += 1;
        if (frameCount.current < (isLowTier ? 1 : 3)) return;
        completeFired.current = true;

        const finishWarmup = () => {
            requestAnimationFrame(() => {
                setIsDone(true);
                onWarmupComplete?.();
            });
        };

        if (isLowTier) {
            finishWarmup();
        } else if (gl.compileAsync) {
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
