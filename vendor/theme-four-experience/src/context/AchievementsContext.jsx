import { createContext, useContext, useMemo } from 'react';

const NOOP = () => {};

const AchievementsContext = createContext({
    completed: [],
    activePopup: null,
    showTutorial: NOOP,
    unlockAchievement: NOOP,
    hidePopup: NOOP,
});

/**
 * The source portfolio's award/tutorial system is intentionally disabled.
 * Scene components still receive stable no-op callbacks so their animation
 * contracts remain untouched without exposing the original author's content.
 */
export const AchievementsProvider = ({ children }) => {
    const value = useMemo(() => ({
        completed: [],
        activePopup: null,
        showTutorial: NOOP,
        unlockAchievement: NOOP,
        hidePopup: NOOP,
    }), []);

    return (
        <AchievementsContext.Provider value={value}>
            {children}
        </AchievementsContext.Provider>
    );
};

export const useAchievements = () => useContext(AchievementsContext);
