/** Up to two uppercase initials for an avatar tile: "Sarah Chen" -> "SC". */
export function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Pronunciation between one pair of slashes. The model sometimes sends the
 * slashes itself ("/flor/"), and wrapping that again showed "//flor//".
 */
export function formatPronunciation(raw) {
  const core = (raw || '').trim().replace(/^\/+|\/+$/g, '').trim();
  return core ? `/${core}/` : '';
}
