/**
 * Contains common animation states to be used in the `FancyButton` class
 */
export const getAnimations = (scale: number) => ({
    default: {
        props: {
            scale: {
                x: 1,
                y: 1,
            },
        },
        duration: 100,
    },
    hover: {
        props: {
            scale: {
                x: 1.1,
                y: 1.1,
            },
        },
        duration: 100,
    },
    pressed: {
        props: {
            scale: {
                x: 0.9,
                y: 0.9,
            },
        },
        duration: 100,
    },
});
