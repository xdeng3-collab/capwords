/**
 * What a thrown poop looks like, by the `effect` an outfit carries (config
 * OUTFITS). `trail` colours the sparks behind it, `burst` the splash when it
 * lands, and `label` is what the lobby calls it.
 */
export const EFFECTS = {
  plain: { label: null, trail: ['#C99A66', '#9B6A3C', '#75492A'], burst: ['#9B6A3C', '#C99A66', '#F2C14E'] },
  ember: { label: 'Ember trail', trail: ['#FFD166', '#F28C38', '#D94A4A'], burst: ['#F28C38', '#FFD166', '#D94A4A'] },
  frost: { label: 'Frost trail', trail: ['#FFFFFF', '#BDEBFA', '#5DB7DE'], burst: ['#BDEBFA', '#FFFFFF', '#5DB7DE'] },
  gold: { label: 'Holy light', trail: ['#FFFFFF', '#FBE7A8', '#F2C14E'], burst: ['#F2C14E', '#FFFFFF', '#FBE7A8'] },
  arcane: { label: 'Arcane sparks', trail: ['#FFFFFF', '#F7A8F0', '#7B4FC9'], burst: ['#B48CF2', '#F7A8F0', '#FBE7A8'] },
  laser: { label: 'Laser beam', trail: ['#FFFFFF', '#3DF0FF', '#FF4FD8'], burst: ['#3DF0FF', '#FF4FD8', '#FFFFFF'] },
  inferno: { label: 'Dragonfire', trail: ['#FFF3B0', '#FF8A3D', '#C1272D'], burst: ['#FF8A3D', '#C1272D', '#FFF3B0'] },
};

export function effectFor(id) {
  return EFFECTS[id] || EFFECTS.plain;
}

// The arena's backdrop changes with every boss beaten.
const BIOMES = [
  { name: 'Meadow', sky: '#8FC6E8', skyLow: '#C9E6F5', ground: '#7CB06A', dirt: '#5E8F4E', orb: '#F2C14E', dots: '#FFFFFF', night: false },
  { name: 'Sunset Hills', sky: '#F2A65A', skyLow: '#F7CFA0', ground: '#C98A3B', dirt: '#8C5A22', orb: '#D94A4A', dots: '#FBE7A8', night: false },
  { name: 'Crystal Cave', sky: '#3B3350', skyLow: '#55496F', ground: '#6E628A', dirt: '#4A4063', orb: '#8FD3E8', dots: '#BDEBFA', night: true },
  { name: 'Midnight Woods', sky: '#1F2A4A', skyLow: '#33456E', ground: '#3F6B4C', dirt: '#2B4A36', orb: '#FBF3E0', dots: '#FBE7A8', night: true },
];

export function biomeForLevel(level, bossEvery) {
  return BIOMES[Math.floor((level - 1) / bossEvery) % BIOMES.length];
}
