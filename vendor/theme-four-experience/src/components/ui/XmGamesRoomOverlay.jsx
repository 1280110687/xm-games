import { useEffect, useMemo, useState } from 'react';
import { useScene } from '../../context/SceneContext';
import '../../styles/XmGamesRoomOverlay.scss';

const COPY = {
    zh: {
        eyebrow: 'XM-GAMES · 3D 世界',
        galleryTitle: '游戏馆',
        galleryDescription: '所有游戏集中在这个房间。选择一个项目后，将从 3D 世界进入真实游戏页面。',
        toolsTitle: '离线工具间',
        toolsDescription: '文本、二维码、JSON、加密与追番工具单独收纳，不与游戏混在一起。',
        loungeTitle: '联机休息室',
        loungeDescription: 'XM-Games 支持多款棋类与 Bingo 的 H5 联机体验。具体游戏入口统一放在游戏馆，避免房间之间重复。',
        aboutTitle: '关于 XM-Games',
        aboutDescription: '一个移动端优先、轻量、本地优先的游戏与实用工具集合。',
        open: '进入',
        explore: '展开完整目录',
        close: '收起目录',
        goToGames: '前往游戏馆',
        loading: '正在读取游戏目录…',
        loungePoints: ['手机优先的 H5 体验', '游戏状态与主题展示分离', '支持本地、离线与局域网玩法'],
        aboutPoints: ['22 个真实游戏与工具入口', '中文、English、ไทย 三语言', '四套相互独立的主题体验'],
    },
    en: {
        eyebrow: 'XM-GAMES · 3D WORLD',
        galleryTitle: 'Game Hall',
        galleryDescription: 'Every game lives in this room. Pick one to leave the 3D world and open the real game route.',
        toolsTitle: 'Offline Toolbox',
        toolsDescription: 'Text, QR, JSON, crypto and anime utilities stay separate from the games.',
        loungeTitle: 'LAN Lounge',
        loungeDescription: 'XM-Games supports mobile multiplayer for board games and Bingo. All playable entries remain together in the Game Hall.',
        aboutTitle: 'About XM-Games',
        aboutDescription: 'A lightweight, mobile-first collection of games and practical local tools.',
        open: 'Open',
        explore: 'Open full catalog',
        close: 'Close catalog',
        goToGames: 'Go to Game Hall',
        loading: 'Loading the game catalog…',
        loungePoints: ['Mobile-first H5 experience', 'Game state stays separate from presentation themes', 'Local, offline and LAN play'],
        aboutPoints: ['22 real game and tool routes', '中文, English and ไทย', 'Four independently designed themes'],
    },
    th: {
        eyebrow: 'XM-GAMES · โลก 3D',
        galleryTitle: 'ห้องเกม',
        galleryDescription: 'รวมเกมทั้งหมดไว้ในห้องนี้ เลือกเกมเพื่อออกจากโลก 3D และเปิดหน้าเกมจริง',
        toolsTitle: 'ห้องเครื่องมือออฟไลน์',
        toolsDescription: 'เครื่องมือข้อความ QR JSON การเข้ารหัส และติดตามอนิเมะแยกออกจากเกมอย่างชัดเจน',
        loungeTitle: 'เลานจ์ LAN',
        loungeDescription: 'XM-Games รองรับเกมกระดานและ Bingo แบบหลายผู้เล่นบนมือถือ โดยรวมทางเข้าเกมทั้งหมดไว้ที่ห้องเกม',
        aboutTitle: 'เกี่ยวกับ XM-Games',
        aboutDescription: 'คอลเลกชันเกมและเครื่องมือที่เบา เน้นมือถือ และทำงานในเครื่อง',
        open: 'เปิด',
        explore: 'เปิดรายการทั้งหมด',
        close: 'ปิดรายการ',
        goToGames: 'ไปที่ห้องเกม',
        loading: 'กำลังโหลดรายการเกม…',
        loungePoints: ['ประสบการณ์ H5 ที่เน้นมือถือ', 'สถานะเกมแยกจากธีมการแสดงผล', 'รองรับการเล่นในเครื่อง ออฟไลน์ และ LAN'],
        aboutPoints: ['ทางเข้าเกมและเครื่องมือจริง 22 รายการ', '中文 English และ ไทย', 'ธีมอิสระสี่รูปแบบ'],
    },
};

const EMPTY_CONTEXT = { locale: 'zh', categories: [] };

const isContextMessage = (event) => (
    event.origin === window.location.origin &&
    event.source === window.parent &&
    event.data?.type === 'xm-games:theme-four-context' &&
    Array.isArray(event.data.payload?.categories)
);

const RoomLink = ({ game, copy, onNavigate }) => (
    <button type="button" className="xm-room-game-link" onClick={() => onNavigate(game.href)}>
        <span>
            <strong>{game.label}</strong>
            <small>{game.description}</small>
        </span>
        <em>{copy.open}</em>
    </button>
);

const XmGamesRoomOverlay = () => {
    const { currentRoom, isInRoom, teleportTo } = useScene();
    const [context, setContext] = useState(EMPTY_CONTEXT);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const handleMessage = (event) => {
            if (isContextMessage(event)) setContext(event.data.payload);
        };

        window.addEventListener('message', handleMessage);
        window.parent.postMessage({ type: 'xm-games:theme-four-ready' }, window.location.origin);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        setIsExpanded(false);
    }, [currentRoom]);

    const locale = COPY[context.locale] ? context.locale : 'zh';
    const copy = COPY[locale];
    const gameCategories = useMemo(
        () => context.categories.filter((category) => category.id !== 'categoryTools'),
        [context.categories],
    );
    const toolCategories = useMemo(
        () => context.categories.filter((category) => category.id === 'categoryTools'),
        [context.categories],
    );

    const navigate = (href) => {
        window.parent.postMessage(
            { type: 'xm-games:theme-four-navigate', href },
            window.location.origin,
        );
    };

    if (!isInRoom) return null;

    const isGameHall = currentRoom === 'gallery';
    const isToolbox = currentRoom === 'contact';
    const isLounge = currentRoom === 'studio';
    const categories = isGameHall ? gameCategories : toolCategories;
    const title = isGameHall
        ? copy.galleryTitle
        : isToolbox
            ? copy.toolsTitle
            : isLounge
                ? copy.loungeTitle
                : copy.aboutTitle;
    const description = isGameHall
        ? copy.galleryDescription
        : isToolbox
            ? copy.toolsDescription
            : isLounge
                ? copy.loungeDescription
                : copy.aboutDescription;
    const points = isLounge ? copy.loungePoints : copy.aboutPoints;

    return (
        <section className={`xm-room-overlay xm-room-${currentRoom}`} aria-labelledby="xm-room-title">
            <div className={`xm-room-paper${isExpanded ? ' is-expanded' : ''}`}>
                <header>
                    <span>{copy.eyebrow}</span>
                    <h1 id="xm-room-title">{title}</h1>
                    <p>{description}</p>
                </header>

                {(isGameHall || isToolbox) && (
                    <button
                        type="button"
                        className="xm-room-catalog-toggle"
                        aria-expanded={isExpanded}
                        onClick={() => setIsExpanded((expanded) => !expanded)}
                    >
                        {isExpanded ? copy.close : copy.explore}
                    </button>
                )}

                {(isGameHall || isToolbox) && isExpanded && (
                    <div className="xm-room-catalog">
                        {categories.length === 0 ? (
                            <p className="xm-room-loading">{copy.loading}</p>
                        ) : categories.map((category) => (
                            <section key={category.id} className="xm-room-category">
                                <div>
                                    <strong>{category.label}</strong>
                                    <small>{category.description}</small>
                                </div>
                                <div className="xm-room-game-grid">
                                    {category.games.map((game) => (
                                        <RoomLink key={game.href} game={game} copy={copy} onNavigate={navigate} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {!isGameHall && !isToolbox && (
                    <div className="xm-room-summary">
                        {isExpanded && (
                            <ol>
                                {points.map((point, index) => (
                                    <li key={point}>
                                        <span>{String(index + 1).padStart(2, '0')}</span>
                                        <strong>{point}</strong>
                                    </li>
                                ))}
                            </ol>
                        )}
                        <button
                            type="button"
                            className="xm-room-details-toggle"
                            aria-expanded={isExpanded}
                            onClick={() => setIsExpanded((expanded) => !expanded)}
                        >
                            {isExpanded ? copy.close : copy.explore}
                        </button>
                        <button type="button" onClick={() => teleportTo('gallery')}>
                            {copy.goToGames}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default XmGamesRoomOverlay;
