import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW } from '../../../theme';
import { PixelIcon } from '../../../components';
import { selectFeedback, tapFeedback } from '../../../utils/haptics';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clamp,
  clusterOnRegion,
  clusterPoints,
  focusOnLatest,
  globeRadiusForRegion,
  landCellIndex,
  locatedPoints,
  meshRows,
  paintGlobe,
  regionForGlobe,
  wrapLongitude,
} from './geo';
import PlaceSheet from './PlaceSheet';
import RealMap from './RealMap';

/**
 * The Book's globe: a pixel-art Earth with a pin wherever a word was snapped.
 *
 * Closed, it is a strip at the top of the Book with half the globe rising
 * into it, turning slowly. Tapping or pulling it down opens it to full
 * height, spins round to the newest photo and zooms in a little - and there
 * the system map (RealMap: Apple Maps) fades in at the same place and flies
 * the rest of the way down. From then on it is a real map: dragged, pinched,
 * and its photo pins tapped to see the photos and words taken there. Zoomed
 * back out to about a continent, it fades back into the pixel globe.
 *
 * The globe is drawn the way every other sprite in the app is - square Views
 * on a grid - so it needs no graphics library. geo.js works out the colours
 * and hands back each row as runs, merged into rectangles.
 */

const CELL = 6;
const BORDER = 3;
export const GLOBE_CLOSED_HEIGHT = 132;

// Indexed by the colour slots paintGlobe() writes: the outline, then ocean,
// land and ice, each lit / mid / shaded.
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
];
const NIGHT = '#2B2748';
const STAR_COLORS = ['#FBF3E0', '#F2C14E', '#8FC6E8'];

const CLOSED_LAT = 8;
const DRIFT_DEG_PER_SEC = 9;
// The idle drift is redrawn at a pixel-art frame rate, not the display's.
const DRIFT_FRAME_MS = 90;
// However big the picture, never draw slower than this while moving.
const MAX_FRAME_MS = 80;
// The drawn globe only goes this close. Opening zooms in to it as the last
// step of the spin, and then the system map takes over; pinching the drawn
// globe past it hands over too, once the fingers lift.
const GLOBE_ZOOM = 2.6;
// Zoomed back out on the system map until the globe would be this size, it
// fades back to the drawn globe - which then pulls back to show it whole.
const HAND_BACK_ZOOM = 2;
const WHOLE_GLOBE_ZOOM = 1.15;
const MAP_FADE_MS = 300;
// Once the view has held still this long, a globe zoomed in far enough is
// handed over to the system map.
const SETTLE_MS = 150;
// The system map's pins are spaced so their photos do not overlap.
const MAP_PIN_SPACING = 46;

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The open globe's radius in cells at zoom 1. */
const openRadius = (innerWidth) => (innerWidth / CELL) * 0.42;

/** Where the globe sits on the cell grid for a given view and panel size. */
function sceneFor(view, innerWidth, openHeight) {
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
    cx: cols / 2,
    cy: lerp(closedRows + 2, openRows / 2, view.open),
    cols: Math.ceil(cols),
    rows: Math.ceil((height - BORDER * 2) / CELL),
    height,
  };
}

function Surface({ rects }) {
  const views = [];
  for (let i = 0; i < rects.length; i += 5) {
    views.push(
      <View
        // Keyed by order, not position: as the globe turns the same Views are
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

/** A pin on the drawn globe: a dot, bigger where more photos were taken. */
function Dot({ cluster }) {
  const count = cluster.items.length;
  const size = count >= 10 ? 14 : count >= 3 ? 12 : 10;
  const x = Math.round(cluster.x) * CELL;
  const y = Math.round(cluster.y) * CELL;
  return <View style={[styles.dot, { left: x - size / 2, top: y - size / 2, width: size, height: size }]} />;
}

/** A square pixel-framed button holding one of the usual map symbols. */
function MapButton({ icon, onPress, on = false, label }) {
  return (
    <TouchableOpacity
      style={[styles.button, on && styles.buttonOn]}
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={COLORS.text} />
    </TouchableOpacity>
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
  const mapHeight = openHeight - BORDER * 2;
  const points = useMemo(() => locatedPoints(stickers), [stickers]);
  const extraLand = useMemo(
    () => new Set(points.map((p) => landCellIndex(p.latitude, p.longitude))),
    [points]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [, repaint] = useReducer((n) => n + 1, 0);

  // The system map: whether it is mounted (from opening until it has faded
  // out after closing), whether it is the one showing, whether the drawn
  // globe under it can stop being drawn (once the map has fully faded in),
  // standard or satellite, and where it was last moved to.
  const [mapMounted, setMapMounted] = useState(false);
  const [onMap, setOnMap] = useState(false);
  const [globeHidden, setGlobeHidden] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [mapRegion, setMapRegion] = useState(null);
  const mapRef = useRef(null);
  const mapFade = useRef(new Animated.Value(0)).current;
  // Where the map starts out, hidden, when the globe opens; and where it
  // carries on to after taking over from the opening fly-in.
  const mapStart = useRef(null);
  const mapLanding = useRef(null);

  // Motion asks for a frame with paint(), which spaces frames out by how long
  // the last one took: the globe steps a little more coarsely instead of
  // falling behind the finger.
  const renderStarted = performance.now();
  const pace = useRef({ cost: 0, last: 0, pending: null });
  useLayoutEffect(() => {
    pace.current.cost = performance.now() - renderStarted;
  });
  const paint = useCallback(() => {
    const state = pace.current;
    const wait = Math.min(MAX_FRAME_MS, state.cost * 1.5) - (performance.now() - state.last);
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
  const clustersRef = useRef([]);
  const settle = useRef({ timer: null, arm: null });
  useEffect(() => () => clearTimeout(settle.current.timer), []);

  const scene = sceneFor(view, innerWidth, openHeight);
  live.current = { points, innerWidth, openHeight, mapHeight, active, isOpen, onMap, mapRegion };

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
          // Zoom is eased by ratio, so zooming in and out feel the same.
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
        const { innerWidth: w, openHeight: h } = live.current;
        const perPx = 57.3 / (sceneFor(view, w, h).radius * CELL);
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
        paint();
      }

      const keepGoing =
        live.current.active && (tweens.current.length || drift || fling.current.x || fling.current.y);
      state.raf = keepGoing ? requestAnimationFrame(frame) : null;
      if (!keepGoing) settle.current.arm?.();
    },
    [view, paint]
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

  /** The region the system map shows for the globe at `zoom` centred here. */
  const regionAt = useCallback((lat, lon, zoom) => {
    const { innerWidth: w, mapHeight: h } = live.current;
    return regionForGlobe(lat, lon, openRadius(w) * zoom, w, h, CELL);
  }, []);

  /** Fade the system map in over the drawn globe, at the same place. */
  const handOver = useCallback(() => {
    if (live.current.onMap) return;
    const region = regionAt(view.lat, view.lon, view.zoom);
    mapRef.current?.animateToRegion(region, 0);
    setMapRegion(region);
    setOnMap(true);
    live.current.onMap = true;
    Animated.timing(mapFade, { toValue: 1, duration: MAP_FADE_MS, useNativeDriver: true }).start(
      ({ finished }) => {
        if (!finished || !live.current.onMap) return;
        setGlobeHidden(true);
        // Taking over from the opening fly-in: carry on the rest of the way.
        const landing = mapLanding.current;
        mapLanding.current = null;
        if (landing) mapRef.current?.animateToRegion(landing, 1200);
      }
    );
  }, [view, mapFade, regionAt]);

  /**
   * From the system map back to the drawn globe, at the place the map was
   * showing. Unless `closing`, the map fades out and the globe then pulls
   * back to show itself whole; closing has its own animation.
   */
  const handBack = useCallback(
    (region, closing = false) => {
      view.lat = clamp(region.latitude, -85, 85);
      view.lon = wrapLongitude(region.longitude);
      view.zoom = GLOBE_ZOOM;
      mapLanding.current = null;
      live.current.onMap = false;
      setOnMap(false);
      setGlobeHidden(false);
      setSelected(null);
      repaint();
      Animated.timing(mapFade, { toValue: 0, duration: MAP_FADE_MS, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished && !live.current.isOpen) setMapMounted(false);
        }
      );
      if (!closing) tween({ zoom: WHOLE_GLOBE_ZOOM }, 700, easeOut);
    },
    [view, mapFade, tween]
  );

  const onMapMoved = useCallback(
    (region) => {
      if (!live.current.onMap) return;
      setMapRegion(region);
      const zoom = globeRadiusForRegion(region, live.current.innerWidth, CELL) / openRadius(live.current.innerWidth);
      if (zoom < HAND_BACK_ZOOM) handBack(region);
    },
    [handBack]
  );

  // When everything has come to rest on a globe zoomed in as far as it goes,
  // hand over to the system map. Armed whenever the animation loop runs dry.
  settle.current.arm = () => {
    clearTimeout(settle.current.timer);
    settle.current.timer = setTimeout(() => {
      const { active: on, isOpen: opened, onMap: mapShowing } = live.current;
      if (!on || !opened || mapShowing || view.open !== 1) return;
      if (tweens.current.length || drag.current || pinching.current) return;
      if (view.zoom >= GLOBE_ZOOM * 0.95) handOver();
    }, SETTLE_MS);
  };

  /** Spin round to the newest photo, zoom in, and let the map fly on from there. */
  const flyToLatest = useCallback(
    async (spin) => {
      const focus = focusOnLatest(live.current.points);
      if (!focus) return;
      const landing = regionAt(focus.latitude, focus.longitude, Math.max(focus.zoom, GLOBE_ZOOM));
      // Already on the system map: it makes the whole trip.
      if (live.current.onMap) {
        mapRef.current?.animateToRegion(landing, 1000);
        return;
      }
      mapLanding.current = landing;
      const ahead = (((focus.longitude - view.lon) % 360) + 360) % 360;
      let turn = ahead > 180 ? ahead - 360 : ahead;
      // On opening, always arrive with a good eastward spin.
      if (spin) turn = ahead < 120 ? ahead + 360 : ahead;
      if (Math.abs(turn) > 1 || Math.abs(focus.latitude - view.lat) > 1) {
        const turned = await tween(
          { lon: view.lon + turn, lat: focus.latitude, zoom: 1 },
          spin ? 1300 : 800
        );
        if (!turned) return;
        view.lon = wrapLongitude(view.lon);
      }
      if (await tween({ zoom: GLOBE_ZOOM }, 500, easeInOut)) handOver();
    },
    [view, tween, regionAt, handOver]
  );

  const open = useCallback(() => {
    if (live.current.isOpen) return;
    tapFeedback();
    // The system map goes in place now, hidden, where the fly-in will hand
    // over to it - so it has its map loaded by the time it is shown.
    const focus = focusOnLatest(live.current.points);
    mapStart.current = focus
      ? regionAt(focus.latitude, focus.longitude, GLOBE_ZOOM)
      : regionAt(view.lat, view.lon, GLOBE_ZOOM);
    setMapMounted(true);
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
  }, [cancelTweens, tween, flyToLatest, regionAt, view]);

  const close = useCallback(() => {
    tapFeedback();
    // The map fades out over the globe as it shrinks back into the strip.
    if (live.current.onMap && live.current.mapRegion) handBack(live.current.mapRegion, true);
    else setMapMounted(false);
    setIsOpen(false);
    setSelected(null);
    cancelTweens(true);
    fling.current = { x: 0, y: 0 };
    drifting.current = false;
    tween({ open: 0, zoom: 1, lat: CLOSED_LAT }, 520, easeInOut, true);
  }, [cancelTweens, tween, handBack]);

  const zoomBy = useCallback(
    (factor) => {
      selectFeedback();
      const region = live.current.mapRegion;
      if (live.current.onMap && region) {
        mapRef.current?.animateToRegion(
          {
            ...region,
            latitudeDelta: region.latitudeDelta / factor,
            longitudeDelta: region.longitudeDelta / factor,
          },
          280
        );
        return;
      }
      tween({ zoom: clamp(view.zoom * factor, MIN_ZOOM, GLOBE_ZOOM) }, 280, easeOut);
    },
    [view, tween]
  );

  const pick = useCallback((x, y) => {
    let best = null;
    let bestDistance = 18 * 18;
    clustersRef.current.forEach((cluster) => {
      const d = (cluster.x * CELL - x) ** 2 + (cluster.y * CELL - y) ** 2;
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
        view.zoom = clamp(pinchFrom * event.scale, MIN_ZOOM, GLOBE_ZOOM);
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
  }, [isOpen, open, pick, cancelTweens, kick, paint, view]);

  // Under the system map, once it has fully faded in, the globe is not drawn.
  const lines = globeHidden ? [] : paintGlobe(scene, scene.cols, scene.rows, extraLand);
  const rects = meshRows(lines);
  const clusters = globeHidden ? [] : clusterPoints(points, scene, scene.cols, scene.rows, 2.5);
  clustersRef.current = clusters;
  const mapClusters =
    onMap && mapRegion
      ? clusterOnRegion(points, mapRegion, innerWidth, mapHeight, MAP_PIN_SPACING)
      : [];

  const pinnedLabel = `${points.length} ${points.length === 1 ? 'PIN' : 'PINS'}`;

  return (
    <View style={[styles.panel, { width, height: scene.height }]}>
      <Stars width={innerWidth} height={openHeight} />

      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            <Surface rects={rects} />
            {clusters.map((cluster) => (
              <Dot key={cluster.id} cluster={cluster} />
            ))}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {mapMounted ? (
        <Animated.View
          style={[styles.map, { height: mapHeight, opacity: mapFade }]}
          pointerEvents={onMap ? 'auto' : 'none'}
        >
          <RealMap
            ref={mapRef}
            initialRegion={mapStart.current}
            mapType={mapType}
            clusters={mapClusters}
            onRegionChangeComplete={onMapMoved}
            onPickCluster={(cluster) => {
              selectFeedback();
              setSelected({ id: cluster.id, items: cluster.items });
            }}
            onPressMap={() => setSelected(null)}
          />
        </Animated.View>
      ) : null}

      <View style={styles.label} pointerEvents="none">
        <Text style={styles.labelText}>{isOpen ? pinnedLabel : 'WORD MAP'}</Text>
      </View>

      {isOpen ? (
        <>
          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={close}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close map"
          >
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>

          {!selected ? (
            <View style={styles.controls}>
              {onMap ? (
                <MapButton
                  icon="layers-outline"
                  label={mapType === 'standard' ? 'Show satellite' : 'Show map'}
                  on={mapType !== 'standard'}
                  onPress={() => {
                    selectFeedback();
                    setMapType((type) => (type === 'standard' ? 'hybrid' : 'standard'));
                  }}
                />
              ) : null}
              {points.length ? (
                <MapButton
                  icon="locate-outline"
                  label="Go to newest photo"
                  onPress={() => {
                    selectFeedback();
                    cancelTweens(false);
                    flyToLatest(false);
                  }}
                />
              ) : null}
              <View style={styles.zoomPair}>
                <MapButton icon="add" label="Zoom in" onPress={() => zoomBy(2)} />
                <MapButton icon="remove" label="Zoom out" onPress={() => zoomBy(1 / 2)} />
              </View>
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
  // Full open height from the top, so the map keeps its size - and so its
  // place - while the panel around it shrinks on closing.
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  dot: {
    position: 'absolute',
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
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
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },
  button: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    ...SHADOW.soft,
  },
  buttonOn: {
    backgroundColor: COLORS.sun,
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
    alignItems: 'center',
  },
  // Zoom in and out sit together, as on any map.
  zoomPair: {
    gap: 4,
  },
  hint: {
    position: 'absolute',
    left: 16,
    right: 60,
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
