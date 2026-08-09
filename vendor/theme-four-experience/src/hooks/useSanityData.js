import { useState } from 'react';

// Theme Four is intentionally isolated from the reference portfolio's CMS.
// Returning null keeps every room on its bundled fallback content and prevents
// the embedded scene from sending Sanity requests from the XM-Games origin.
export const isSanityConfigured = false;

const cache = Object.freeze({
    projects: null,
    content: null,
    awards: null,
    loading: false,
    loaded: true,
    error: null,
});

export function loadSanityData() {
    return Promise.resolve(cache);
}

export function isSanityDataLoaded() {
    return true;
}

export function useGalleryProjects() {
    const [projects] = useState(null);
    return projects;
}

export function useStudioContent() {
    const [content] = useState(null);
    return content;
}

export function useAwards() {
    const [awards] = useState(null);
    return awards;
}
