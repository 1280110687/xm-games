// XM Games: keep replays local; do not upload or share player data.
export function shareableQuery(url: string): string { return new URL(url).search }
export function shorten(url: string, action: (url: string) => void) { action(url) }
export function share(_url: string) { return "" }
