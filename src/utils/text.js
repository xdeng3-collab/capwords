/** Up to two uppercase initials for an avatar tile: "Sarah Chen" -> "SC". */
export function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
