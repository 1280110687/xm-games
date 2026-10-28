export const device = {
    /**
     * Indicates if the device is a mobile device or not.
     * @returns true if the device is mobile, false otherwise.
     */
    isMobileDevice() {
        return window.matchMedia('(pointer: coarse)').matches;
    },
};
