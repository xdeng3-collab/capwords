// Pixel geometry: tiny, consistent corner radii (near-square for retro feel)
export const RADIUS = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  pill: 10,
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

// Hard-edged "pixel" drop shadow (offset, no blur) for the retro UI look.
export const SHADOW = {
  card: {
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 4,
  },
  soft: {
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 2,
  },
  glow: {
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 6,
  },
};
