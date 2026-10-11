import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, RADIUS, SHADOW } from '../../../theme';
import { PixelIcon } from '../../../components';
import {
  MAP_ATTRIBUTION,
  cachedMapTile,
  loadMapTiles,
  mapTilesPending,
  warmMapTiles,
} from '../../../services/mapService';
import { selectFeedback, tapFeedback } from '../../../utils/haptics';
import {
  MAX_LEVEL,
  MAX_ZOOM,
  MIN_LEVEL,
  MIN_ZOOM,
  clamp,
  clusterPoints,
  focusOnLatest,
  landCellIndex,
  commonestColour,
  levelFor,
  levelRadius,
  locatedPoints,
  meshRows,
  levelTiles,
  paintGlobe,
  paintLevel,
  projectLevel,
  snapScene,
  wrapLongitude,
} from './geo';
import PlaceSheet from './PlaceSheet';

/**
 * The Book's globe: a pixel-art Earth with a pin wherever a word was snapped.
 *
 * Closed, it is a strip at the top of the Book with half the globe rising
 * into it, turning slowly. Tapping or pulling it down opens it to full
 * height, spins round to the newest photo and flies in. Open, it can be
 * dragged, pinched, and its pins tapped to see the photos and words there.
 *
 * It is drawn the way every other sprite in the app is - square Views on a
 * grid - so it needs no graphics library. geo.js works out the colours and
 * hands back each row as runs, merged into rectangles, which keeps a frame of
 * open sea to a few dozen Views and a city's streets to about a thousand.
 *
 * Far out it is a ball, with land from a small mask built into the app.
 * Close in it becomes a flat map at fixed levels (see geo.js), filled in with
 * coastlines, parks, buildings and streets from map tiles
 * (services/mapService.js) as they arrive; offline it simply stays coarse.
 */

const CELL = 6;
const BORDER = 3;
export const GLOBE_CLOSED_HEIGHT = 132;

// Indexed by the colour slots paintGlobe() writes: outline; ocean, land and
// ice, each lit / mid / shaded; then sand, buildings, main roads and streets.
const GLOBE_COLORS = [
  COLORS.outline,
  '#8FC6E8',
  '#5D8FC4',
  '#41699C',
  '#A3CF7E',
  '#7CB06A',
  '#4E7B45',
  '#FBF3E0',
  '#DDE3E2',
  '#AEBBC6',
  '#E8D6AE',
  '#D3BF9B',
  '#F5DFA0',
  '#F6ECD4',
];
const NIGHT = '#2B2748';
const STAR_COLORS = ['#FBF3E0', '#F2C14E', '#8FC6E8'];

const CLOSED_LAT = 8;
const DRIFT_DEG_PER_SEC = 9;
// The idle drift is redrawn at a pixel-art frame rate, not the display's.
const DRIFT_FRAME_MS = 90;
// Below this zoom pins are dots; from here on they show the photo.
const PHOTO_ZOOM = 3;
const PHOTO_SIZE = 40;
// Once the view has held still this long it snaps to the nearest level and
// fetches the map tiles it is looking at.
const SETTLE_MS = 150;
// However heavy the picture, never draw slower than this while moving.
const MAX_FRAME_MS = 80;
// Close in, the globe is drawn at fixed levels (see geo.js) and the picture
// is slid and stretched to follow the finger, so it only has to be redrawn
// on reaching a new level or the edge of what was drawn - which is this many
// cells beyond the screen on every side.
const LEVEL_MARGIN = 8;
const LEVEL_FRAME_MS = 60;
// Opening flies no deeper than this: a neighbourhood's rivers and main roads.
// Streets and buildings are a pinch further in.
const FLY_MAX_LEVEL = 13;

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The open globe's radius in cells at zoom 1. */
const openRadius = (innerWidth) => (innerWidth / CELL) * 0.42;

/**
 * The level the globe is at, fractional - or null while it is closed or
 * still far enough out to be drawn as a ball.
 */
function levelOf(view, innerWidth) {
  if (view.open !== 1) return null;
  const exact = levelFor(openRadius(innerWidth) * view.zoom, view.lat);
  return exact >= MIN_LEVEL - 1e-6 ? exact : null;
}
const wholeLevel = (exact) => Math.min(MAX_LEVEL, Math.floor(exact + 1e-6));

/**
 * Where the globe sits on the cell grid for a given view and panel size.
 * `margin` grows the grid by that many cells on every side, off screen.
 */
function sceneFor(view, innerWidth, openHeight, margin = 0) {
  const cols = innerWidth / CELL;
  const closedRows = (GLOBE_CLOSED_HEIGHT - BORDER * 2) / CELL;
  const openRows = (openHeight - BORDER * 2) / CELL;
  const height = lerp(GLOBE_CLOSED_HEIGHT, openHeight, view.open);
  return {
    lon: view.lon,
    lat: view.lat,
    // Closed, the centre sits just under the strip so about half shows.
    radius: lerp(closedRows - 1, openRadius(innerWidth), view.open) * view.zoom,
    shading: clamp(1 - (view.zoom - 1) / 2, 0, 1),
    cx: cols / 2 + margin,
    cy: lerp(closedRows + 2, openRows / 2, view.open) + margin,
    cols: Math.ceil(cols) + margin * 2,
    rows: Math.ceil((height - BORDER * 2) / CELL) + margin * 2,
    height,
  };
}

function Surface({ rects }) {
  const views = [];
  for (let i = 0; i < rects.length; i += 5) {
    views.push(
      <View
        // Keyed by order, not position: as the globe moves the same Views are
        // re-styled, which is far cheaper than making new ones.
        key={i}
        style={{
          position: 'absolute',
          left: rects[i] * CELL,
          top: rects[i + 1] * CELL,
          width: rects[i + 2] * CELL,
          height: rects[i + 3] * CELL,
          backgroundColor: GLOBE_COLORS[rects[i + 4]],
        }}
      />
    );
  }
  return views;
}

const Stars = React.memo(function Stars({ width, height }) {
  const stars = useMemo(() => {
    const out = [];
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const count = Math.round((width * height) / 5200);
    for (let i = 0; i < count; i += 1) {
      out.push({
        left: Math.floor((next() * width) / CELL) * CELL,
        top: Math.floor((next() * height) / CELL) * CELL,
        size: next() < 0.25 ? 4 : 2,
        color: STAR_COLORS[Math.floor(next() * STAR_COLORS.length)],
      });
    }
    return out;
  }, [width, height]);

  return stars.map((star, i) => (
    <View
      key={i}
      style={{
        position: 'absolute',
        left: star.left,
        top: star.top,
        width: star.size,
        height: star.size,
        backgroundColor: star.color,
      }}
    />
  ));
});

function Pin({ cluster, photos }) {
  const count = cluster.items.length;
  const x = Math.round(cluster.x) * CELL;
  const y = Math.round(cluster.y) * CELL;

  if (!photos) {
    const size = count >= 10 ? 14 : count >= 3 ? 12 : 10;
    return <View style={[styles.dot, { left: x - size / 2, top: y - size / 2, width: size, height: size }]} />;
  }

  const [newest] = cluster.items;
  return (
    <View style={[styles.photoPin, { left: x - PHOTO_SIZE / 2, top: y - PHOTO_SIZE / 2 }]}>
      {newest.imageUri ? (
        <Image source={{ uri: newest.imageUri }} style={styles.photo} />
      ) : (
        <View style={styles.photoFallback}>
          <PixelIcon name="star" size={18} color={COLORS.primary} />
        </View>
      )}
      {count > 1 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function GlobeView({
  stickers,
  width,
  openHeight,
  active,
  onOpenChange,
  onOpenSticker,
}) {
  const innerWidth = width - BORDER * 2;
  const points = useMemo(() => locatedPoints(stickers), [stickers]);
  const extraLand = useMemo(
    () => new Set(points.map((p) => landCellIndex(p.latitude, p.longitude))),
    [points]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [, repaint] = useReducer((n) => n + 1, 0);

  // A street map is thousands of cells where the open sea is a few dozen, and
  // drawing it can take longer than a frame. So motion asks for a frame with
  // paint(), which spaces them out by how long the last one took: the globe
  // steps a little more coarsely instead of falling behind the finger.
  const renderStarted = performance.now();
  const pace = useRef({ cost: 0, last: 0, pending: null });
  const paint = useCallback(() => {
    const state = pace.current;
    const { margin: m, innerWidth: w } = live.current;
    if (m) {
      // At a level, the picture drawn is still good until the view reaches
      // another level or the edge of it.
      const was = drawn.current;
      const exact = levelOf(view, w);
      const reach = (m - 2) * CELL * was.scale;
      const good =
        exact != null &&
        wholeLevel(exact) === was.level &&
        Math.abs(was.x) < reach &&
        Math.abs(was.y) < reach;
      if (good) return;
    }
    const gap = m
      ? Math.max(LEVEL_FRAME_MS, state.cost * 1.5)
      : Math.min(MAX_FRAME_MS, state.cost * 1.5);
    const wait = gap - (performance.now() - state.last);
    if (wait <= 0) {
      clearTimeout(state.pending);
      state.pending = null;
      state.last = performance.now();
      repaint();
    } else if (!state.pending) {
      state.pending = setTimeout(() => {
        state.pending = null;
        state.last = performance.now();
        repaint();
      }, wait);
    }
  }, []);
  useEffect(() => () => clearTimeout(pace.current.pending), []);

  // The view is animated outside React state: a frame writes it, then asks
  // for one repaint.
  const view = useRef({ lon: 100, lat: CLOSED_LAT, zoom: 1, open: 0 }).current;
  const tweens = useRef([]);
  const fling = useRef({ x: 0, y: 0 });
  const drag = useRef(null);
  const pinching = useRef(false);
  const loop = useRef({ raf: null, last: 0, painted: 0 });
  const live = useRef({});
  // Open with nothing pinned, the globe keeps drifting until it is touched.
  const drifting = useRef(false);
  const clustersRef = useRef({ list: [], photos: false });

  // Far out the globe is drawn afresh wherever the view is. Close in it is
  // drawn at a whole level, squared up to the map, with room to spare round
  // the edges - and then moved about rather than redrawn.
  const exactLevel = isOpen ? levelOf(view, innerWidth) : null;
  const level = exactLevel == null ? null : wholeLevel(exactLevel);
  const margin = level == null ? 0 : LEVEL_MARGIN;
  const seen = sceneFor(view, innerWidth, openHeight, margin);
  const scene = level == null ? seen : snapScene(seen, level);
  live.current = { points, innerWidth, openHeight, active, isOpen, margin };

  // How the picture on screen has been moved since it was drawn: slid to
  // wherever the point it was centred on has got to, and stretched by however
  // much closer the view is than the level it was drawn at.
  const shift = useRef(new Animated.ValueXY()).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const drawn = useRef({ lon: 0, lat: 0, radius: 1, level: null, x: 0, y: 0, scale: 1 });
  const slide = useCallback(() => {
    const { margin: m, innerWidth: w, openHeight: h } = live.current;
    const was = drawn.current;
    let x = 0;
    let y = 0;
    let scale = 1;
    if (m) {
      scale = sceneFor(view, w, h, m).radius / was.radius;
      // How far, on the flat map it was drawn from, its centre is from the
      // view's now.
      const here = { lon: view.lon, lat: view.lat, cx: 0, cy: 0 };
      const at = projectLevel(here, was.level, was.lat, was.lon);
      x = at.x * scale * CELL;
      y = at.y * scale * CELL;
    }
    if (x !== was.x || y !== was.y) shift.setValue({ x, y });
    if (scale !== was.scale) stretch.setValue(scale);
    was.x = x;
    was.y = y;
    was.scale = scale;
  }, [view, shift, stretch]);
  useLayoutEffect(() => {
    pace.current.cost = performance.now() - renderStarted;
    drawn.current.lon = scene.lon;
    drawn.current.lat = scene.lat;
    drawn.current.radius = scene.radius;
    drawn.current.level = level;
    slide();
  });

  const settle = useRef({ timer: null, arm: null });
  useEffect(() => () => clearTimeout(settle.current.timer), []);

  useEffect(() => onOpenChange?.(isOpen), [isOpen, onOpenChange]);

  // A selection may point at stickers that have since been deleted.
  useEffect(() => setSelected(null), [stickers]);

  const cancelTweens = useCallback((includingLocked) => {
    const kept = [];
    tweens.current.forEach((tween) => {
      if (tween.locked && !includingLocked) kept.push(tween);
      else tween.resolve(false);
    });
    tweens.current = kept;
  }, []);

  const frame = useCallback(
    (now) => {
      const state = loop.current;
      const dt = Math.min(0.05, (now - state.last) / 1000);
      state.last = now;
      let changed = false;
      let smooth = false;

      tweens.current = tweens.current.filter((tween) => {
        // A tween starts on the first frame that sees it.
        if (tween.start == null) tween.start = now;
        const t = Math.min(1, (now - tween.start) / tween.duration);
        const eased = tween.ease(t);
        Object.keys(tween.to).forEach((key) => {
          const from = tween.from[key];
          const to = tween.to[key];
          // Zoom spans orders of magnitude, so it is eased by ratio.
          view[key] = key === 'zoom' ? from * (to / from) ** eased : lerp(from, to, eased);
          if (t === 1) view[key] = to;
        });
        changed = true;
        smooth = true;
        if (t === 1) tween.resolve(true);
        return t < 1;
      });

      const { x, y } = fling.current;
      if (Math.abs(x) + Math.abs(y) > 12) {
        const radiusPx = sceneFor(view, live.current.innerWidth, live.current.openHeight).radius * CELL;
        const perPx = 57.3 / radiusPx;
        view.lon -= (x * dt * perPx) / Math.max(0.3, Math.cos((view.lat * Math.PI) / 180));
        view.lat = clamp(view.lat + y * dt * perPx, -85, 85);
        const decay = Math.exp(-dt * 4);
        fling.current = { x: x * decay, y: y * decay };
        changed = true;
        smooth = true;
      } else {
        fling.current = { x: 0, y: 0 };
      }

      const idle = !tweens.current.length && !drag.current;
      const drift = idle && (view.open === 0 || drifting.current);
      if (drift) {
        view.lon = wrapLongitude(view.lon + DRIFT_DEG_PER_SEC * dt);
        changed = true;
      }

      if (changed && (smooth || now - state.painted >= DRIFT_FRAME_MS)) {
        state.painted = now;
        slide();
        paint();
      }

      const keepGoing = live.current.active && (tweens.current.length || drift || fling.current.x || fling.current.y);
      state.raf = keepGoing ? requestAnimationFrame(frame) : null;
      if (!keepGoing) settle.current.arm?.();
    },
    [view, paint, slide]
  );

  const kick = useCallback(() => {
    if (loop.current.raf != null || !live.current.active) return;
    loop.current.raf = requestAnimationFrame((now) => {
      loop.current.last = now;
      frame(now);
    });
  }, [frame]);

  useEffect(() => {
    if (active) kick();
    return () => {
      if (loop.current.raf != null) cancelAnimationFrame(loop.current.raf);
      loop.current.raf = null;
    };
  }, [active, kick]);

  /** Animate some of the view's fields. Resolves false if it was interrupted. */
  const tween = useCallback(
    (to, duration, ease = easeInOut, locked = false) =>
      new Promise((resolve) => {
        const from = {};
        Object.keys(to).forEach((key) => {
          from[key] = view[key];
        });
        // Replace any animation already driving the same fields.
        tweens.current = tweens.current.filter((other) => {
          const clash = Object.keys(other.to).some((key) => key in to);
          if (clash) other.resolve(false);
          return !clash;
        });
        tweens.current.push({ from, to, duration, ease, locked, resolve, start: null });
        kick();
      }),
    [view, kick]
  );

  /** The tiles a view at `level` centred here would be looking at. */
  const tilesAround = useCallback((lon, lat, level) => {
    const { innerWidth: w, openHeight: h } = live.current;
    const zoom = levelRadius(level, lat) / openRadius(w);
    const at = snapScene(sceneFor({ lon, lat, zoom, open: 1 }, w, h, LEVEL_MARGIN), level);
    return levelTiles(at, level, at.cols, at.rows);
  }, []);

  // When everything has come to rest: ease onto the nearest whole level, then
  // fetch the tiles in view. Armed whenever the animation loop runs dry.
  settle.current.arm = () => {
    clearTimeout(settle.current.timer);
    settle.current.timer = setTimeout(() => {
      const { innerWidth: w, active: on, isOpen: opened } = live.current;
      if (!on || !opened || tweens.current.length || drag.current || pinching.current) return;
      const exact = levelOf(view, w);
      if (exact == null) return;
      let nearest = clamp(Math.round(exact), MIN_LEVEL, MAX_LEVEL);
      while (nearest > MIN_LEVEL && levelRadius(nearest, view.lat) / openRadius(w) > MAX_ZOOM) {
        nearest -= 1;
      }
      const zoom = levelRadius(nearest, view.lat) / openRadius(w);
      if (Math.abs(Math.log2(zoom / view.zoom)) > 0.01) {
        tween({ zoom }, 220, easeOut);
        return;
      }
      loadMapTiles(tilesAround(view.lon, view.lat, nearest), repaint);
      // Put the "loading" sign up if that left anything to wait for.
      if (mapTilesPending()) repaint();
    }, SETTLE_MS);
  };

  /**
   * Where opening the globe will fly to: the newest photo, the zoom to land
   * at, and the tiles the dive needs - a coarse overview of the whole view
   * first, since that alone is enough to draw from, then the landing level,
   * then the level passed further out.
   */
  const flightPlan = useCallback(() => {
    const focus = focusOnLatest(live.current.points);
    if (!focus) return null;
    const base = openRadius(live.current.innerWidth);
    const exact = levelFor(base * focus.zoom, focus.latitude);
    if (exact < MIN_LEVEL) return { focus, zoom: focus.zoom, landing: null, tiles: [] };
    const landing = clamp(Math.round(exact), MIN_LEVEL, FLY_MAX_LEVEL);
    const tiles = [landing - 3, landing, landing - 6]
      .filter((l) => l >= MIN_LEVEL)
      .flatMap((l) => tilesAround(focus.longitude, focus.latitude, l));
    return { focus, zoom: levelRadius(landing, focus.latitude) / base, landing, tiles };
  }, [tilesAround]);

  // While the globe is still closed, get that map onto the phone. Opening it
  // then waits on neither the network nor on decoding tiles mid-flight - and
  // one level further in is ready too, for the first pinch.
  useEffect(() => {
    if (!active || isOpen) return;
    const plan = flightPlan();
    if (!plan || plan.landing == null) return;
    const { longitude, latitude } = plan.focus;
    const deeper = Math.min(plan.landing + 1, MAX_LEVEL);
    warmMapTiles([...plan.tiles, ...tilesAround(longitude, latitude, deeper)]);
  }, [active, isOpen, points, flightPlan, tilesAround]);

  /** Spin round to the newest photo, then fly in. */
  const flyToLatest = useCallback(
    async (spin) => {
      const plan = flightPlan();
      if (!plan) return;
      const { focus, zoom } = plan;
      // Whatever the warm-up did not get to, fetch now, so the dive is
      // through real map.
      loadMapTiles(plan.tiles, repaint);
      const ahead = (((focus.longitude - view.lon) % 360) + 360) % 360;
      let turn = ahead > 180 ? ahead - 360 : ahead;
      // On opening, always arrive with a good eastward spin.
      if (spin) turn = ahead < 120 ? ahead + 360 : ahead;
      // Pull back first if we are zoomed in somewhere else.
      const far = Math.abs(turn) > 1 || Math.abs(focus.latitude - view.lat) > 1;
      if (far && view.zoom > 1.5 && !(await tween({ zoom: 1 }, 450))) return;
      if (far) {
        const turned = await tween(
          { lon: view.lon + turn, lat: focus.latitude },
          spin ? 1300 : 800
        );
        if (!turned) return;
        view.lon = wrapLongitude(view.lon);
      }
      await tween({ zoom }, clamp(300 + 55 * Math.log2(zoom), 350, 950));
    },
    [view, tween, flightPlan]
  );

  const open = useCallback(() => {
    if (live.current.isOpen) return;
    tapFeedback();
    setIsOpen(true);
    cancelTweens(true);
    fling.current = { x: 0, y: 0 };
    tween({ open: 1 }, 420, easeOut, true);
    if (live.current.points.length) {
      drifting.current = false;
      flyToLatest(true);
    } else {
      drifting.current = true;
      tween({ lat: 18 }, 420, easeOut);
    }
  }, [cancelTweens, tween, flyToLatest]);

  const close = useCallback(() => {
    tapFeedback();
    setIsOpen(false);
    setSelected(null);
    cancelTweens(true);
    fling.current = { x: 0, y: 0 };
    drifting.current = false;
    tween({ open: 0, zoom: 1, lat: CLOSED_LAT }, 420, easeInOut, true);
  }, [cancelTweens, tween]);

  const zoomBy = useCallback(
    (factor) => {
      selectFeedback();
      tween({ zoom: clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM) }, 280, easeOut);
    },
    [view, tween]
  );

  const pick = useCallback((x, y) => {
    const { list, photos } = clustersRef.current;
    const reach = photos ? PHOTO_SIZE / 2 + 6 : 18;
    let best = null;
    let bestDistance = reach * reach;
    // Clusters are where they were drawn; the tap is on the screen, and the
    // picture may have been slid and stretched since.
    const { margin: m, canvas } = live.current;
    const was = drawn.current;
    const px = canvas.width / 2 + (x + m * CELL - was.x - canvas.width / 2) / was.scale;
    const py = canvas.height / 2 + (y + m * CELL - was.y - canvas.height / 2) / was.scale;
    list.forEach((cluster) => {
      const d = (cluster.x * CELL - px) ** 2 + (cluster.y * CELL - py) ** 2;
      if (d <= bestDistance) {
        best = cluster;
        bestDistance = d;
      }
    });
    if (best) selectFeedback();
    setSelected(best ? { id: best.id, items: best.items } : null);
  }, []);

  const gesture = useMemo(() => {
    if (!isOpen) {
      const tap = Gesture.Tap()
        .runOnJS(true)
        .onEnd((_event, success) => {
          if (success) open();
        });
      // Opens as soon as it has been pulled far enough, not on letting go.
      const pull = Gesture.Pan()
        .runOnJS(true)
        .minDistance(8)
        .onUpdate((event) => {
          if (event.translationY > 24) open();
        });
      return Gesture.Race(pull, tap);
    }

    const pan = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .minDistance(4)
      .onStart(() => {
        cancelTweens(false);
        drifting.current = false;
        fling.current = { x: 0, y: 0 };
        const { innerWidth: w, openHeight: h } = live.current;
        drag.current = { lon: view.lon, lat: view.lat, radiusPx: sceneFor(view, w, h).radius * CELL };
      })
      .onUpdate((event) => {
        const start = drag.current;
        if (!start) return;
        const perPx = 57.3 / start.radiusPx;
        view.lat = clamp(start.lat + event.translationY * perPx, -85, 85);
        view.lon =
          start.lon -
          (event.translationX * perPx) / Math.max(0.3, Math.cos((start.lat * Math.PI) / 180));
        slide();
        paint();
      })
      .onEnd((event) => {
        fling.current = { x: event.velocityX, y: event.velocityY };
      })
      .onFinalize(() => {
        drag.current = null;
        view.lon = wrapLongitude(view.lon);
        kick();
      });

    let pinchFrom = 1;
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        cancelTweens(false);
        drifting.current = false;
        pinching.current = true;
        pinchFrom = view.zoom;
      })
      .onUpdate((event) => {
        view.zoom = clamp(pinchFrom * event.scale, MIN_ZOOM, MAX_ZOOM);
        slide();
        paint();
      })
      .onFinalize(() => {
        pinching.current = false;
        kick();
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(8)
      .onEnd((event, success) => {
        if (success) pick(event.x, event.y);
      });

    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [isOpen, open, pick, cancelTweens, kick, paint, slide, view]);

  const lines =
    level == null
      ? paintGlobe(scene, scene.cols, scene.rows, extraLand)
      : paintLevel(scene, level, scene.cols, scene.rows, extraLand, cachedMapTile);
  // Close in, the globe fills the whole picture: whatever colour most of it is
  // goes down as one backdrop, which also shows where a drag outruns it.
  const backdrop = margin ? commonestColour(lines) : -1;
  const rects = meshRows(lines, backdrop);
  const photos = isOpen && view.open === 1 && view.zoom >= PHOTO_ZOOM;
  const clusters = clusterPoints(points, scene, scene.cols, scene.rows, photos ? 8 : 2.5, level);
  clustersRef.current = { list: clusters, photos };
  live.current.canvas = { width: scene.cols * CELL, height: scene.rows * CELL };

  const pinnedLabel = `${points.length} ${points.length === 1 ? 'PIN' : 'PINS'}`;

  return (
    <View style={[styles.panel, { width, height: scene.height }]}>
      <Stars width={innerWidth} height={openHeight} />

      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <GestureDetector gesture={gesture}>
          <View
            style={[
              StyleSheet.absoluteFill,
              backdrop >= 0 ? { backgroundColor: GLOBE_COLORS[backdrop] } : null,
            ]}
            collapsable={false}
          >
            <Animated.View
              style={{
                position: 'absolute',
                left: -margin * CELL,
                top: -margin * CELL,
                width: scene.cols * CELL,
                height: scene.rows * CELL,
                transform: [...shift.getTranslateTransform(), { scale: stretch }],
              }}
            >
              <Surface rects={rects} />
              {clusters.map((cluster) => (
                <Pin key={cluster.id} cluster={cluster} photos={photos} />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      <View style={styles.label} pointerEvents="none">
        <Text style={styles.labelText}>{isOpen ? pinnedLabel : 'WORD MAP'}</Text>
      </View>

      {level != null ? (
        <Text style={styles.attribution} pointerEvents="none">
          {MAP_ATTRIBUTION}
        </Text>
      ) : null}

      {isOpen ? (
        <>
          <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={close} hitSlop={8}>
            <PixelIcon name="close" size={14} color={COLORS.text} />
          </TouchableOpacity>

          {!selected ? (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.button} onPress={() => zoomBy(2)} hitSlop={4}>
                <PixelIcon name="plus" size={14} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => zoomBy(1 / 2)} hitSlop={4}>
                <PixelIcon name="minus" size={14} color={COLORS.text} />
              </TouchableOpacity>
              {points.length ? (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    selectFeedback();
                    cancelTweens(false);
                    flyToLatest(false);
                  }}
                  hitSlop={4}
                >
                  <PixelIcon name="target" size={14} color={COLORS.secondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {level != null && !selected && mapTilesPending() > 0 ? (
            <View style={styles.loading} pointerEvents="none">
              <Text style={styles.labelText}>LOADING MAP...</Text>
            </View>
          ) : null}

          {!points.length ? (
            <View style={styles.hint} pointerEvents="none">
              <Text style={styles.hintText}>
                NO PINS YET - SNAP A WORD WITH LOCATION ON AND IT LANDS HERE
              </Text>
            </View>
          ) : null}

          {selected ? (
            <PlaceSheet
              items={selected.items}
              onClose={() => setSelected(null)}
              onOpenSticker={onOpenSticker}
            />
          ) : null}
        </>
      ) : (
        <View style={[styles.label, styles.exploreLabel]} pointerEvents="none">
          <PixelIcon name="chevron" size={10} color={COLORS.text} style={styles.chevronDown} />
          <Text style={styles.labelText}>EXPLORE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: NIGHT,
    borderRadius: RADIUS.md,
    borderWidth: BORDER,
    borderColor: COLORS.outline,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  photoPin: {
    position: 'absolute',
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    ...SHADOW.soft,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    paddingHorizontal: 3,
    alignItems: 'center',
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  countText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
  },
  label: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  exploreLabel: {
    left: undefined,
    right: 8,
    backgroundColor: COLORS.sun,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.8,
  },
  attribution: {
    position: 'absolute',
    top: 40,
    left: 8,
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: `${COLORS.surface}CC`,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    ...SHADOW.soft,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  controls: {
    position: 'absolute',
    right: 8,
    bottom: 12,
    gap: 8,
  },
  loading: {
    position: 'absolute',
    left: 8,
    bottom: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  hint: {
    position: 'absolute',
    left: 16,
    right: 56,
    bottom: 14,
    backgroundColor: COLORS.surface,
    padding: 8,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  hintText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.5,
    lineHeight: 15,
  },
});
