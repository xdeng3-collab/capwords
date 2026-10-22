import { DESTINATIONS, JOURNEY } from '../../../../config';
import {
  DECOS,
  FLAG,
  HALO,
  ISLAND_GRID,
  ISLAND_PALETTES,
  MILESTONE_FLAG,
  PROPS,
  SPARKLE,
  STAR,
  WAVE_GRID,
  ZONES,
  zoneIndexOf,
  zoneOf,
  zonesMissingArt,
} from '../seaArt';

// New places are added to config/journey.js and seaArt.js separately; these
// catch the half-finished ones before they reach the map.

/** Characters in `grid` that `palette` has no colour for. */
function unpainted(grid, palette) {
  const keys = new Set(grid.join('').replace(/[. ]/g, ''));
  return [...keys].filter((k) => !palette[k]);
}

describe('journey places', () => {
  it('has art for every destination', () => {
    expect(zonesMissingArt()).toEqual([]);
    expect(ZONES.map((z) => z.key)).toEqual(DESTINATIONS.map((d) => d.key));
  });

  it('starts at the dock and only ever moves forward', () => {
    expect(DESTINATIONS[0].from).toBe(0);
    DESTINATIONS.slice(1).forEach((d, i) => expect(d.from).toBeGreaterThan(DESTINATIONS[i].from));
    expect(new Set(DESTINATIONS.map((d) => d.key)).size).toBe(DESTINATIONS.length);
  });

  it('gives every place a guide entry', () => {
    DESTINATIONS.forEach((d) => {
      expect(d.name).toBeTruthy();
      expect(d.region).toBeTruthy();
      expect(d.about).toBeTruthy();
      expect(d.facts.length).toBeGreaterThan(0);
      if (d.hello) expect(d.hello.word && d.hello.language).toBeTruthy();
    });
  });

  it('finds the place for an island', () => {
    expect(zoneOf(0).key).toBe(DESTINATIONS[0].key);
    expect(zoneIndexOf(DESTINATIONS[1].from - 1)).toBe(0);
    expect(zoneIndexOf(DESTINATIONS[1].from)).toBe(1);
    // Past the last place the buddy stays there until more are added.
    expect(zoneOf(10000).key).toBe(DESTINATIONS[DESTINATIONS.length - 1].key);
    expect(DESTINATIONS.some((d) => d.from === JOURNEY.milestoneEvery)).toBe(true);
  });
});

describe('sprites', () => {
  it('paints every pixel of every zone', () => {
    ZONES.forEach((z) => {
      expect(PROPS[z.prop]).toBeDefined();
      z.decos.forEach((key) => expect(DECOS[key]).toBeDefined());
      expect(unpainted(ISLAND_GRID, ISLAND_PALETTES[z.key])).toEqual([]);
    });
  });

  it('paints every pixel of every sprite', () => {
    const sprites = { ...PROPS, ...DECOS, FLAG, MILESTONE_FLAG, STAR, HALO, SPARKLE };
    Object.entries(sprites).forEach(([name, sprite]) => {
      expect([name, unpainted(sprite.grid, sprite.palette)]).toEqual([name, []]);
    });
    expect(unpainted(WAVE_GRID, { w: '#fff' })).toEqual([]);
  });

  it('keeps sprite rows the same width', () => {
    Object.entries({ ...PROPS, ...DECOS }).forEach(([name, sprite]) => {
      const widths = new Set(sprite.grid.map((row) => row.length));
      expect([name, widths.size]).toEqual([name, 1]);
    });
  });
});
