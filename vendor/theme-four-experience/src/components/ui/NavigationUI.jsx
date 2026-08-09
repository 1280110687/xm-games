import { useEffect, useState } from 'react';
import { useScene } from '../../context/SceneContext';
import '../../styles/NavigationUI.scss';

const BACK_COPY = {
    zh: '返回走廊',
    en: 'Back to corridor',
    th: 'กลับไปทางเดิน',
};

const NavigationUI = () => {
    const { isInRoom, requestExit } = useScene();
    const [locale, setLocale] = useState('zh');
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const handleMessage = (event) => {
            if (
                event.origin === window.location.origin &&
                event.source === window.parent &&
                event.data?.type === 'xm-games:theme-four-context' &&
                BACK_COPY[event.data.payload?.locale]
            ) {
                setLocale(event.data.payload.locale);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (!isInRoom) setIsExiting(false);
    }, [isInRoom]);

    if (!isInRoom) return null;

    const handleBackClick = () => {
        if (isExiting) return;
        setIsExiting(true);
        requestExit();
    };

    return (
        <div className="navigation-ui">
            <button
                type="button"
                className={`nav-btn back-btn ${isExiting ? 'exiting' : ''}`}
                onClick={handleBackClick}
                aria-label={BACK_COPY[locale]}
            >
                <svg viewBox="0 0 24 24" className="icon-back" aria-hidden="true">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>{BACK_COPY[locale]}</span>
            </button>
        </div>
    );
};

export default NavigationUI;
