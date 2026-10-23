import { DESTINATIONS, JOURNEY, OUTFITS } from '../../../../config';
import { OUTFIT_SPRITES } from '../../../../components';
import {
  DECOS,
  FAR,
  FLAG,
  HALO,
  ISLAND_GRID,
  ISLAND_PALETTES,
  ISLAND_SHAPES,
  MILESTONE_FLAG,
  PROPS,
  SPARKLE,
  SPECKS,
  STAR,
  WAVE_GRID,
  ZONES,
  islandGridOf,
  landmarkSilhouette,
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
      expect([z.key, unpainted(islandGridOf(z), ISLAND_PALETTES[z.key])]).toEqual([z.key, []]);
      expect(FAR[z.far.grid]).toBeDefined();
      expect(unpainted(FAR[z.far.grid], { a: z.far.a, b: z.far.b })).toEqual([]);
      expect(SPECKS[z.speck.grid]).toBeDefined();
      expect(unpainted(SPECKS[z.speck.grid], { s: z.speck.s })).toEqual([]);
      const silhouette = landmarkSilhouette(z);
      expect(unpainted(silhouette.grid, silhouette.palette)).toEqual([]);
    });
  });

  it('gives every island shape the same size, so the map lays them out alike', () => {
    Object.entries(ISLAND_SHAPES).forEach(([name, grid]) => {
      expect([name, grid.length]).toEqual([name, ISLAND_GRID.length]);
      grid.forEach((row) => expect([name, row.length]).toEqual([name, ISLAND_GRID[0].length]));
    });
  });

  it('draws every outfit and every souvenir on the buddy', () => {
    const ids = [
      ...OUTFITS.map((o) => o.id).filter((id) => id !== 'none'),
      ...DESTINATIONS.filter((d) => d.souvenir).map((d) => d.souvenir.id),
    ];
    ids.forEach((id) => {
      const sprite = OUTFIT_SPRITES[id];
      expect([id, !!sprite]).toEqual([id, true]);
      expect([id, unpainted(sprite.grid, sprite.palette)]).toEqual([id, []]);
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
