import { enableHybridTouch } from './enableHybridTouch';
import { FancyButton, Switcher } from '@pixi/ui';

import { audio } from '../../audio';
import { storage } from '../../storage';
import { getAnimations } from './configs/animationConfig';

/** Constant to define the default scale of the button */
const DEFAULT_SCALE = 1;

/** Unique button to be used to toggle audio.
 *
 * Uses elements from @pixi/ui.
 */
export class AudioButton extends FancyButton {
    /**
     * A reference to an object used to display the mute state
     *
     * Switcher button from @pixi/ui. Acts similar to a html checkbox
     */
    private _switcher: Switcher;

    constructor() {
        // Check the muted state
        const isMuted = storage.getStorageItem('muted');

        const switcher = new Switcher(
            ['icon-sound-on', 'icon-sound-off'],
            [], // no trigger events, we will control switch manually
            isMuted ? 1 : 0,
        ); // Force the visual switched state to be the muted state

        switcher.scale.set(0.6);

        super({
            // Give sound its own compact, theme-aware touch target.
            defaultView: 'button-flat-small',
            icon: switcher,
            // Set animations using common scaling states based on default scale
            animations: getAnimations(DEFAULT_SCALE),
            // Anchor to center
            anchor: 0.5,
            // Set initial scale to default scale
            scale: DEFAULT_SCALE,
        });

        this._switcher = switcher;

        enableHybridTouch(this);

        this.onPress.connect(() => {
            this.press();
        });
    }

    /**
     * Override function for the FancyButton, called when button is pressed
     */
    public press() {
        const isMuted = storage.getStorageItem('muted');

        // Update the display
        this.forceSwitch(!isMuted);

        // Toggling the mute state of audio
        storage.setStorageItem('muted', !isMuted);

        // Set the actual audio state
        audio.muted(!isMuted);
    }

    /**
     * This method updates the display of the mute state to match the provided muted value.
     * @param muted - The mute state
     */
    public forceSwitch(muted: boolean) {
        // Force the visual switched state to be the muted state
        this._switcher.forceSwitch(muted ? 1 : 0);
    }
}
