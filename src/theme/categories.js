// Retro palette assigned to sticker categories (icon key + color).
// The `icon` maps to a pixel glyph rendered by PixelIcon, never an emoji.
export const CATEGORY_STYLES = {
  food: { icon: 'apple', color: '#D96C6C' },
  animal: { icon: 'paw', color: '#C98A3B' },
  object: { icon: 'box', color: '#8C7BC0' },
  nature: { icon: 'leaf', color: '#7CB06A' },
  drink: { icon: 'drop', color: '#5D8FC4' },
  clothing: { icon: 'shirt', color: '#E0A02E' },
  vehicle: { icon: 'wheel', color: '#5BA88C' },
  other: { icon: 'star', color: '#B5638F' },
};

export function getCategoryStyle(category) {
  if (!category) return CATEGORY_STYLES.other;
  const key = String(category).toLowerCase();
  return CATEGORY_STYLES[key] || CATEGORY_STYLES.other;
}
