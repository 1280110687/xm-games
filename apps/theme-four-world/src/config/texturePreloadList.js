/**
 * Texture Preload List - ALL textures for the entire experience
 * Everything loads during the initial preloader for zero stutter when entering rooms.
 */

// Entrance scene textures
export const ENTRANCE_TEXTURES = [
    // Core
    '/theme-four-experience/textures/paper-texture.webp',
    // Doors
    '/theme-four-experience/textures/doors/frame_sketch.webp',
    '/theme-four-experience/textures/doors/door_left_sketch.webp',
    '/theme-four-experience/textures/doors/door_right_sketch.webp',
    '/theme-four-experience/textures/doors/handle_left_sketch.webp',
    '/theme-four-experience/textures/doors/handle_right_sketch.webp',
    '/theme-four-experience/textures/doors/door_back_left_sketch.webp',
    '/theme-four-experience/textures/doors/pien.webp',
    // Environment
    '/theme-four-experience/textures/entrance/wall_bricks_2.webp',
    '/theme-four-experience/textures/entrance/stone-path.webp',
    '/theme-four-experience/textures/entrance/floor_paper.webp',
    '/theme-four-experience/textures/entrance/belka.webp',
    '/theme-four-experience/textures/entrance/sign.webp',
    // Characters/Objects
    '/theme-four-experience/textures/entrance/cat_front_body.webp',
    '/theme-four-experience/textures/entrance/window_sketch.webp',
    '/theme-four-experience/textures/entrance/tree_sketch.webp',
    '/theme-four-experience/textures/entrance/mouse_hanging.webp',
    '/theme-four-experience/textures/entrance/pot_with_duck.webp',
    '/theme-four-experience/textures/entrance/bug_sketch.webp',
    '/theme-four-experience/textures/entrance/speech_bubble.webp',
    // Images
    '/theme-four-experience/images/ink-splash.webp',
];

// Corridor scene textures
export const CORRIDOR_TEXTURES = [
    // Walls/Floor/Ceiling
    '/theme-four-experience/textures/corridor/wall_texture.webp',
    '/theme-four-experience/textures/corridor/kawalekpodlogi.webp',
    '/theme-four-experience/textures/corridor/texturadoprogow.webp',
    '/theme-four-experience/textures/corridor/texturadrewnadonozekbiurka.webp',
    '/theme-four-experience/textures/corridor/ceiling_texture.webp',
    // Double doors (end of corridor)
    '/theme-four-experience/textures/corridor/doors/frame_sketch.webp',
    '/theme-four-experience/textures/corridor/doors/doorrleft.webp',
    '/theme-four-experience/textures/corridor/doors/dorright.webp',
    '/theme-four-experience/textures/corridor/doors/handle_left_sketch.webp',
    '/theme-four-experience/textures/corridor/doors/handle_right_sketch.webp',
    '/theme-four-experience/textures/corridor/doors/pien.webp',
    // Single side doors
    '/theme-four-experience/textures/corridor/doors/ramkasingledoors.webp',
    '/theme-four-experience/textures/corridor/doors/klamkadodrzwi.webp',
    '/theme-four-experience/textures/corridor/doors/backsingledoors.webp',
    '/theme-four-experience/textures/corridor/doors/drzwiprojekty.webp',
    '/theme-four-experience/textures/corridor/doors/drzwisocial.webp',
    '/theme-four-experience/textures/corridor/doors/drzwiabout.webp',
    '/theme-four-experience/textures/corridor/doors/drzwikontakt.webp',
    '/theme-four-experience/textures/corridor/doors/drzwiprojekty_painted.webp',
    '/theme-four-experience/textures/corridor/doors/drzwisocial_painted.webp',
    '/theme-four-experience/textures/corridor/doors/drzwiabout_painted.webp',
    '/theme-four-experience/textures/corridor/doors/drzwikontakt_painted.webp',
    // Signs
    '/theme-four-experience/textures/corridor/pustatabliczka.webp',
    // Decorations
    '/theme-four-experience/textures/corridor/decorations/while_true_loop.webp',
    '/theme-four-experience/textures/corridor/decorations/coffee_debug.webp',
    '/theme-four-experience/textures/corridor/decorations/idea_process.webp',
    '/theme-four-experience/textures/corridor/decorations/paper_ball.webp',
    '/theme-four-experience/textures/corridor/decorations/paper_airplane.webp',
    '/theme-four-experience/textures/corridor/decorations/pencil.webp',
    '/theme-four-experience/textures/corridor/decorations/coffee_cup.webp',
    // CorridorDecorations - frames, furniture, lamps
    '/theme-four-experience/textures/corridor/ramkanazdjecieduza.webp',
    '/theme-four-experience/textures/corridor/ramkanazdjecieduza_painted.webp',
    '/theme-four-experience/textures/corridor/ramkanazdjeciemala.webp',
    '/theme-four-experience/textures/corridor/drzewkowdoniczce.webp',
    '/theme-four-experience/textures/corridor/kratkawentylacyjna.webp',
    '/theme-four-experience/textures/corridor/kwiatekwdoniczce.webp',
    '/theme-four-experience/textures/corridor/kratanalampy.webp',
    '/theme-four-experience/textures/corridor/bokilampy.webp',
    '/theme-four-experience/textures/corridor/gorastolika.webp',
    '/theme-four-experience/textures/corridor/szafkaprzod.webp',
    '/theme-four-experience/textures/corridor/szafkaprzodgora.webp',
    '/theme-four-experience/textures/corridor/rysuneknaobraz1.webp',
    '/theme-four-experience/textures/corridor/rysuneknaobrazek3.webp',
    // DoorSection extras
    '/theme-four-experience/textures/corridor/strzalka.webp',
    '/theme-four-experience/textures/corridor/doors/door_back.webp',
    '/theme-four-experience/textures/corridor/doors/klamkadodrzwi_painted.webp',
];

// Standard HTML Image assets (preloaded via new Image() in App.jsx)
export const IMAGE_ASSETS = [
    '/theme-four-experience/images/ink-splash.webp',
];

// Additional textures from App.jsx and avatar animations
export const UI_TEXTURES = [];

// ============================================
// ROOM TEXTURES - Preloaded for instant room entry
// ============================================

// Gallery Room textures (loaded via useTexture / drei)
// These are organized to handle conditional painted vs standard versions
export const GALLERY_TEXTURES_BASE = [
    '/theme-four-experience/textures/gallery/floor.webp',
    '/theme-four-experience/textures/gallery/railing.webp',
    '/theme-four-experience/textures/gallery/domki.webp',
    '/theme-four-experience/textures/gallery/miastotlo.webp',
    '/theme-four-experience/textures/gallery/bird_gray.webp',
    '/theme-four-experience/textures/gallery/klamerka.webp',
    '/theme-four-experience/textures/gallery/openliveproject.webp',
];

export const GALLERY_TEXTURES_VERSIONED = [
    // Project cards
    'monetuneprzod',
    'timberkittyprzod',
    'youngmultiprzod',
    'bioprzod',
    // Card back
    'tylkartki',
    'przyciskdotylukartki',
    // Tech stack logos
    'csslogo',
    'elementorlogo',
    'firebaselogo',
    'htmllogo',
    'jslogo',
    'netlifylogo',
    'phplogo',
    'reactlogo',
    'tailwindlogo',
    'wordpresslogo',
];

export const GALLERY_TEXTURES = [
    ...GALLERY_TEXTURES_BASE,
    ...GALLERY_TEXTURES_VERSIONED.flatMap(name => [
        `/theme-four-experience/textures/gallery/${name}.webp`,
        name === 'csslogo' ? `/theme-four-experience/textures/gallery/css3logo_painted.webp` : `/theme-four-experience/textures/gallery/${name}_painted.webp`
    ])
];

// Contact Room textures (loaded via useTexture / drei)
export const CONTACT_TEXTURES = [
    '/theme-four-experience/textures/contact/faletopdown.webp',
    '/theme-four-experience/textures/contact/molo.webp',
    '/theme-four-experience/textures/contact/latarnia.webp',
    '/theme-four-experience/textures/contact/statek.webp',
    '/theme-four-experience/textures/contact/paper_form.webp',
    '/theme-four-experience/textures/contact/send_button.webp',
    '/theme-four-experience/textures/contact/beczka.webp',
    '/theme-four-experience/textures/contact/beczka_painted.webp',
];

// About Room textures (loaded via useLoader(TextureLoader))
export const ABOUT_TEXTURES = [
    // Avatar
    '/theme-four-experience/textures/about/awatarnachmurce.webp',
    // Awards
    '/theme-four-experience/textures/about/SOTY.webp',
    '/theme-four-experience/textures/about/SOTY_painted.webp',
    '/theme-four-experience/textures/about/SOTD.webp',
    '/theme-four-experience/textures/about/SOTD_painted.webp',
    '/theme-four-experience/textures/about/SOTM.webp',
    '/theme-four-experience/textures/about/SOTM_painted.webp',
    '/theme-four-experience/textures/about/button.webp',
    '/theme-four-experience/textures/about/button_painted.webp',
    // Award images (for overlay)
    '/theme-four-experience/textures/about/SOTDAYYOUNGMULTICSSWINNER.webp',
    '/theme-four-experience/textures/about/SOTDAYYOUNGMULTIGSAP.webp',
    '/theme-four-experience/textures/about/SOTDAYYOUNGMULTIORPETRON.webp',
    '/theme-four-experience/textures/about/SOTDAYYOUNGMULTIDESIGNNOMINESS.webp',
    // Journey islands
    '/theme-four-experience/textures/about/uowyspa.webp',
    '/theme-four-experience/textures/about/freelancewyspa.webp',
    // Skill balloons - large
    '/theme-four-experience/textures/about/reactduzybalon.webp',
    '/theme-four-experience/textures/about/reactduzybalon_painted.webp',
    '/theme-four-experience/textures/about/threejsduzybalon.webp',
    '/theme-four-experience/textures/about/threejsduzybalon_painted.webp',
    '/theme-four-experience/textures/about/GSAPduzybalon.webp',
    '/theme-four-experience/textures/about/GSAPduzybalon_painted.webp',
    // Skill balloons - medium
    '/theme-four-experience/textures/about/JSSREDNIBALON.webp',
    '/theme-four-experience/textures/about/JSSREDNIBALON_painted.webp',
    '/theme-four-experience/textures/about/csssrednibalon.webp',
    '/theme-four-experience/textures/about/csssrednibalon_painted.webp',
    '/theme-four-experience/textures/about/nextjssrednibalon.webp',
    '/theme-four-experience/textures/about/nextjssrednibalon_painted.webp',
    // Skill balloons - small
    '/theme-four-experience/textures/about/htmlmalybalon.webp',
    '/theme-four-experience/textures/about/htmlmalybalon_painted.webp',
    '/theme-four-experience/textures/about/gitmalybalon.webp',
    '/theme-four-experience/textures/about/gitmalybalon_painted.webp',
    '/theme-four-experience/textures/about/figmamalybalon.webp',
    '/theme-four-experience/textures/about/figmamalybalon_painted.webp',
    '/theme-four-experience/textures/about/firebasemalybalon.webp',
    '/theme-four-experience/textures/about/firebasemalybalon_painted.webp',
    // Clouds
    '/theme-four-experience/textures/clouds/1131c3eb-dfae-423f-924b-ff39d8ccd6dc.webp',
    '/theme-four-experience/textures/clouds/254b8ec8-d6f7-4275-956f-7bab65b2ce2d.webp',
    '/theme-four-experience/textures/clouds/2cc88dd1-483c-466d-b07e-f8308c61ccbe.webp',
    '/theme-four-experience/textures/clouds/5606fcc0-3252-447d-a58a-7bcbac73229a.webp',
    '/theme-four-experience/textures/clouds/7882dc72-3d01-41fb-ac0e-d07b0184ebc1.webp',
    '/theme-four-experience/textures/clouds/9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.webp',
    '/theme-four-experience/textures/clouds/c83293c6-d90c-4a32-8d9d-5ac9af7e2296.webp',
    '/theme-four-experience/textures/clouds/f6e358bc-d27c-41dd-95f4-6787a835c41e.webp',
];

// Studio Room textures (loaded via useLoader(TextureLoader))
export const STUDIO_TEXTURES = [
    // Monitor (blog)
    '/theme-four-experience/textures/studio/monitor_front.webp',
    '/theme-four-experience/textures/studio/monitor_front_painted.webp',
    '/theme-four-experience/textures/studio/monitor_back.webp',
    '/theme-four-experience/textures/studio/monitor_back_painted.webp',
    '/theme-four-experience/textures/studio/monitor_top.webp',
    '/theme-four-experience/textures/studio/monitor_top_painted.webp',
    '/theme-four-experience/textures/studio/monitor_bottom.webp',
    '/theme-four-experience/textures/studio/monitor_bottom_painted.webp',
    '/theme-four-experience/textures/studio/monitor_left.webp',
    '/theme-four-experience/textures/studio/monitor_left_painted.webp',
    '/theme-four-experience/textures/studio/monitor_right.webp',
    '/theme-four-experience/textures/studio/monitor_right_painted.webp',
    // TV (youtube)
    '/theme-four-experience/textures/studio/tv_front.webp',
    '/theme-four-experience/textures/studio/tv_front_painted.webp',
    '/theme-four-experience/textures/studio/tv_back.webp',
    '/theme-four-experience/textures/studio/tv_back_painted.webp',
    '/theme-four-experience/textures/studio/tv_top.webp',
    '/theme-four-experience/textures/studio/tv_top_painted.webp',
    '/theme-four-experience/textures/studio/tv_bottom.webp',
    '/theme-four-experience/textures/studio/tv_bottom_painted.webp',
    '/theme-four-experience/textures/studio/tv_side.webp',
    '/theme-four-experience/textures/studio/tv_side_painted.webp',
    // Phone (tiktok)
    '/theme-four-experience/textures/studio/phone_front.webp',
    '/theme-four-experience/textures/studio/phone_front_painted.webp',
    '/theme-four-experience/textures/studio/phone_back.webp',
    '/theme-four-experience/textures/studio/phone_back_painted.webp',
    '/theme-four-experience/textures/studio/phone_side.webp',
    '/theme-four-experience/textures/studio/phone_side_painted.webp',
    // Custom content front textures
    '/theme-four-experience/textures/studio/monitorfront_postnafbdoublewinner.webp',
    '/theme-four-experience/textures/studio/monitorfront_postnafbdoublewinner_painted.webp',
    '/theme-four-experience/textures/studio/phonefront_followmeontiktok.webp',
    '/theme-four-experience/textures/studio/phonefront_followmeontiktok_painted.webp',
    '/theme-four-experience/textures/studio/tvfront_filmikedytowaniezdjec.webp',
    '/theme-four-experience/textures/studio/tvfront_filmikedytowaniezdjec_painted.webp',
    '/theme-four-experience/textures/studio/tvfront_filmikprojektdlamultiego.webp',
    '/theme-four-experience/textures/studio/tvfront_filmikprojektdlamultiego_painted.webp',
];

// ============================================
// COMBINED EXPORTS
// ============================================

// Only the shared 3D world is preloaded. The original portfolio room assets are
// deliberately excluded because XM-Games supplies its own room content.
export const PRELOAD_ALL = [
    ...ENTRANCE_TEXTURES,
    ...CORRIDOR_TEXTURES,
    ...UI_TEXTURES,
    ...IMAGE_ASSETS,
];


// Textures loaded via useLoader(TextureLoader) - about, studio
export const PRELOAD_LOADER = [];

/**
 * Filters the preload list based on whether the device supports hover (desktop) 
 * or is a touch-only device (mobile/tablet).
 * @param {string[]} list The list of texture paths to filter
 * @param {boolean} usePainted Whether to prioritize _painted versions
 * @returns {string[]} The filtered list
 */
export const filterTexturesByDevice = (list, usePainted) => {
    // 1. Identify all paths that have a _painted version available
    const paintedVersions = new Set(list.filter(p => p.includes('_painted.webp')));
    
    // Also include the special css3logo case
    const hasCss3Painted = list.some(p => p.includes('css3logo_painted.webp'));
    
    return list.filter(path => {
        const isPainted = path.includes('_painted.webp');
        const isCss3 = path.includes('css3logo_painted.webp');
        
        // Find the "standard" version for this path if it's a painted one
        let standardVersion = null;
        if (isPainted) {
            standardVersion = path.replace('_painted.webp', '.webp');
        } else if (isCss3) {
            standardVersion = path.replace('css3logo_painted.webp', 'csslogo.webp');
        } else {
            // Check if this standard path HAS a painted version in the list
            const pVersion = path.replace('.webp', '_painted.webp');
            const css3Version = path.replace('csslogo.webp', 'css3logo_painted.webp');
            if (list.includes(pVersion) || (path.includes('csslogo.webp') && hasCss3Painted)) {
                // Return true to keep the standard version! Both desktop and mobile need it.
                return true; 
            }
            // If it doesn't have a painted version, it's a static texture (always keep)
            return true;
        }

        // It's a painted version
        return usePainted;
    });
};
