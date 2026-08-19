import { App } from './core/App.js';
import { LoadingScreen } from './ui/HUD.js';

/**
 * Entry point.
 *
 * Everything interesting lives in `core/App.js`; this file only wires the app
 * to the page and reports fatal boot errors somewhere the user can see them.
 */
const canvas = document.getElementById('viewport');
let activeApp = null;

async function boot() {
  try {
    const app = new App(canvas);
    activeApp = app;
    await app.load();

    // Handy for poking at the scene from the console.
    window.app = app;
    window.parent.postMessage(
      { type: 'xm-games:elemental-arena-ready' },
      window.location.origin
    );
  } catch (error) {
    console.error('[boot] failed to start', error);
    new LoadingScreen().fail(
      error?.message ? `Failed to start: ${error.message}` : 'Failed to start — see the console.'
    );
  }
}

window.addEventListener('pagehide', () => {
  activeApp?.dispose();
  activeApp = null;
  window.app = null;
}, { once: true });

boot();
