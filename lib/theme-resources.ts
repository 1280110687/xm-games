import styles from "./generated/theme-styles.json"
import type { ThemeId } from "./theme"
import { POCKET_DOCUMENT_SIZES, POCKET_GAME_SIZES, pocketArtSrcSet } from "../features/themes/theme-pocket/art"

declare global {
  interface Window {
    __xmLoadThemeStyle?: (theme: ThemeId, href?: string) => Promise<void>
  }
}

// Runs before hydration. The same loader is reused for later theme switches.
export const themeResourcesBootstrapScript = `(() => {
  const styles = ${JSON.stringify(styles)};
  const pending = {};
  window.__xmLoadThemeStyle = (theme, href = styles[theme]) => {
    if (pending[href]) return pending[href];
    pending[href] = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.themeStyle = theme;
      const timer = setTimeout(() => fail(), 15000);
      const fail = () => {
        clearTimeout(timer);
        link.remove();
        delete pending[href];
        reject(new Error('Theme stylesheet unavailable'));
      };
      link.onload = () => { clearTimeout(timer); resolve(); };
      link.onerror = fail;
      document.head.appendChild(link);
    });
    return pending[href];
  };
  const theme = document.documentElement.dataset.theme;
  window.__xmLoadThemeStyle(theme).catch(() => {});
  // Never penalize saved themes or secondary routes with Pocket image requests.
  if (theme !== 'theme-pocket' || location.pathname !== '/' || location.hash) return;
  const pictures = [
    { name: 'documents', sizes: ${JSON.stringify(POCKET_DOCUMENT_SIZES)}, srcset: ${JSON.stringify(pocketArtSrcSet('documents'))}, priority: 'high' },
    { name: 'bingo', sizes: ${JSON.stringify(POCKET_GAME_SIZES)}, srcset: ${JSON.stringify(pocketArtSrcSet('bingo'))}, priority: 'auto' }
  ];
  pictures.forEach(picture => {
    const link = document.createElement('link');
    link.rel = 'preload'; link.as = 'image';
    link.href = '/images/theme-pocket/' + picture.name + '.webp';
    link.imageSrcset = picture.srcset; link.imageSizes = picture.sizes;
    link.fetchPriority = picture.priority;
    document.head.appendChild(link);
  });
})();`

export function loadThemeStyle(theme: ThemeId): Promise<void> {
  return window.__xmLoadThemeStyle?.(theme, styles[theme]) ?? Promise.reject(new Error("Theme bootstrap unavailable"))
}
