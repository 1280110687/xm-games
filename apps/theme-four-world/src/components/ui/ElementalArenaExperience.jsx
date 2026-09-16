import { useState } from 'react';
import { useScene } from '../../context/SceneContext';
import '../../styles/ElementalArenaExperience.scss';

const ElementalArenaExperience = ({ locale = 'en' }) => {
    const { currentRoom, exitRequested } = useScene();
    const [loaded, setLoaded] = useState(false);
    const active = currentRoom === 'elemental' && !exitRequested;

    if (!active) return null;

    return (
        <section
            className={`elemental-arena${loaded ? ' is-loaded' : ''}`}
            aria-label="XM-Games Elemental Arena"
        >
            <iframe
                className="elemental-arena__frame"
                src="/theme-four-experience/elemental-arena/index.html"
                title="XM-Games Elemental Arena"
                allow="fullscreen"
                onLoad={() => setLoaded(true)}
            />
            {!loaded && (
                <div className="elemental-arena__handoff" role="status">
                    <span aria-hidden="true" />
                    <strong>{({ zh: '正在打开元素训练室…', en: 'Opening elemental studio…', th: 'กำลังเปิดห้องฝึกธาตุ…' })[locale]}</strong>
                </div>
            )}
        </section>
    );
};

export default ElementalArenaExperience;
