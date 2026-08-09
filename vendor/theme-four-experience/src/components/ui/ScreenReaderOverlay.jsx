import { useScene } from '../../context/SceneContext';
import '../../styles/ScreenReaderOverlay.scss';

const ROOM_NAMES = {
    gallery: 'XM-Games Game Hall',
    studio: 'LAN Lounge',
    about: 'About XM-Games',
    contact: 'Offline Toolbox',
};

const ScreenReaderOverlay = () => {
    const { hasEntered, isInRoom, currentRoom, teleportTo, requestExit } = useScene();

    return (
        <div className="sr-overlay" role="complementary" aria-label="Accessible navigation for the XM-Games 3D world">
            <a href="#sr-main-nav" className="sr-only sr-focusable">
                Skip to accessible navigation
            </a>

            <nav id="sr-main-nav" className="sr-only" aria-label="XM-Games rooms">
                <h1>XM-Games 3D World</h1>

                {!hasEntered && (
                    <p>Open the entrance doors to enter the XM-Games corridor.</p>
                )}

                {hasEntered && !isInRoom && (
                    <>
                        <p>You are in the corridor. Choose a room:</p>
                        <ul>
                            <li><button type="button" onClick={() => teleportTo('gallery')}>Game Hall</button></li>
                            <li><button type="button" onClick={() => teleportTo('studio')}>LAN Lounge</button></li>
                            <li><button type="button" onClick={() => teleportTo('about')}>About XM-Games</button></li>
                            <li><button type="button" onClick={() => teleportTo('contact')}>Offline Toolbox</button></li>
                        </ul>
                    </>
                )}

                {hasEntered && isInRoom && (
                    <>
                        <p>You are in {ROOM_NAMES[currentRoom] || currentRoom}.</p>
                        <button type="button" onClick={requestExit}>Back to corridor</button>
                    </>
                )}
            </nav>

            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {isInRoom ? `Entered ${ROOM_NAMES[currentRoom] || currentRoom}` : 'In the corridor'}
            </div>
        </div>
    );
};

export default ScreenReaderOverlay;
