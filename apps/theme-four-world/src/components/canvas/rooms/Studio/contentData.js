/**
 * XM-Games content for the original Studio monitor tower.
 * The source room owns the geometry, physics and reveal shaders; these records
 * only replace the portfolio author's screen content and navigation targets.
 */
export const PLATFORM_CONFIG = {
    lan: {
        color: '#286f72',
        accentColor: '#194f52',
        label: 'LAN Play',
        shape: 'tv',
    },
    local: {
        color: '#c97758',
        accentColor: '#8e4934',
        label: 'Local Play',
        shape: 'monitor',
    },
    pocket: {
        color: '#6d8f54',
        accentColor: '#405c32',
        label: 'Pocket Game',
        shape: 'phone',
    },
};

export const CONTENT_DATA = [
    {
        id: 'lan-bingo',
        platform: 'lan',
        device: 'tv',
        title: 'Bingo LAN',
        screenLabel: 'BINGO\nLAN',
        description: 'Host a room and invite nearby players from their phones.',
        href: '/bingo',
        date: '2026-08-08',
    },
    {
        id: 'lan-chinese-chess',
        platform: 'lan',
        device: 'tv',
        title: 'Chinese Chess',
        screenLabel: 'CHINESE\nCHESS',
        description: 'Play a direct two-player match over the local network.',
        href: '/chinese-chess',
        date: '2026-08-07',
    },
    {
        id: 'local-gomoku',
        platform: 'local',
        device: 'monitor',
        title: 'Gomoku',
        screenLabel: 'GOMOKU',
        description: 'A quick local board-game session on one screen.',
        href: '/gomoku',
        date: '2026-08-06',
    },
    {
        id: 'local-reversi',
        platform: 'local',
        device: 'monitor',
        title: 'Reversi',
        screenLabel: 'REVERSI',
        description: 'Classic local strategy with a touch-friendly board.',
        href: '/reversi',
        date: '2026-08-05',
    },
    {
        id: 'local-checkers',
        platform: 'local',
        device: 'monitor',
        title: 'Checkers',
        screenLabel: 'CHECKERS',
        description: 'A compact board-game route for two local players.',
        href: '/checkers',
        date: '2026-08-04',
    },
    {
        id: 'pocket-2048',
        platform: 'pocket',
        device: 'phone',
        title: '2048',
        screenLabel: '2048',
        description: 'Swipe, merge and build the highest tile.',
        href: '/2048',
        date: '2026-08-03',
    },
    {
        id: 'pocket-sudoku',
        platform: 'pocket',
        device: 'phone',
        title: 'Sudoku',
        screenLabel: 'SUDOKU',
        description: 'A focused number puzzle designed for mobile play.',
        href: '/sudoku',
        date: '2026-08-02',
    },
    {
        id: 'pocket-schulte',
        platform: 'pocket',
        device: 'phone',
        title: 'Schulte Grid',
        screenLabel: 'FOCUS',
        description: 'Train visual search and attention in short sessions.',
        href: '/schulte-grid',
        date: '2026-08-01',
    },
];

export const getContentByPlatform = (platform) => (
    platform === 'all'
        ? CONTENT_DATA
        : CONTENT_DATA.filter((item) => item.platform === platform)
);

export const getLatestContent = () => (
    [...CONTENT_DATA].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
);
