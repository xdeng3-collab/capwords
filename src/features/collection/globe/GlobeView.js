import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, RADIUS, SHADOW } from '../../../theme';
import { PixelIcon } from '../../../components';
import { selectFeedback, tapFeedback } from '../../../utils/haptics';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clamp,
  clusterPoints,
  focusOnLatest,
  landCellIndex,
  locatedPoints,
  paintGlobe,
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
 * hands back each row as runs, which keeps a frame to a few hundred Views.
 */

const CELL = 6;
const BORDER = 3;
export const GLOBE_CLOSED_HEIGHT = 132;

// Indexed by the colour slots paintGlobe() writes: outline, then ocean, land
// and ice, each lit / mid / shaded.
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
// Below this zoom pins are dots; from here on they show the photo.
const PHOTO_ZOOM = 3;
const PHOTO_SIZE = 40;

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

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
    radius: lerp(closedRows - 1, cols * 0.42, view.open) * view.zoom,
    shading: clamp(1 - (view.zoom - 1) / 2, 0, 1),
    cx: cols / 2,
    cy: lerp(closedRows + 2, openRows / 2, view.open),
    cols: Math.ceil(cols),
    rows: Math.ceil((height - BORDER * 2) / CELL),
    height,
  };
}

const Row = React.memo(function Row({ line, top }) {
  if (!line) return null;
  return line.split(',').map((run) => {
    const [start, length, colour] = run.split(':');
    return (
      <View
        key={start}
        style={{
          position: 'absolute',
          top,
          left: start * CELL,
          width: length * CELL,
          height: CELL,
          backgroundColor: GLOBE_COLORS[colour],
        }}
      />
    );
  });
});

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

  // The view is animated outside React state: a frame writes it, then asks
  // for one repaint.
  const view = useRef({ lon: 100, lat: CLOSED_LAT, zoom: 1, open: 0 }).current;
  const tweens = useRef([]);
  const fling = useRef({ x: 0, y: 0 });
  const drag = useRef(null);
  const loop = useRef({ raf: null, last: 0, painted: 0 });
  const live = useRef({});
  // Open with nothing pinned, the globe keeps drifting until it is touched.
  const drifting = useRef(false);
  const clustersRef = useRef({ list: [], photos: false });

  const scene = sceneFor(view, innerWidth, openHeight);
  live.current = { points, innerWidth, openHeight, active, isOpen };

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
        repaint();
      }

      const keepGoing = live.current.active && (tweens.current.length || drift || fling.current.x || fling.current.y);
      state.raf = keepGoing ? requestAnimationFrame(frame) : null;
    },
    [view]
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

  /** Spin round to the newest photo, then fly in. */
  const flyToLatest = useCallback(
    async (spin) => {
      const focus = focusOnLatest(live.current.points);
      if (!focus) return;
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
      await tween({ zoom: focus.zoom }, clamp(500 + 200 * Math.log2(focus.zoom), 500, 1800));
    },
    [view, tween]
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
    list.forEach((cluster) => {
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
        repaint();
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
        pinchFrom = view.zoom;
      })
      .onUpdate((event) => {
        view.zoom = clamp(pinchFrom * event.scale, MIN_ZOOM, MAX_ZOOM);
        repaint();
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(8)
      .onEnd((event, success) => {
        if (success) pick(event.x, event.y);
      });

    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [isOpen, open, pick, cancelTweens, kick, view]);

  const lines = paintGlobe(scene, scene.cols, scene.rows, extraLand);
  const photos = isOpen && view.open === 1 && view.zoom >= PHOTO_ZOOM;
  const clusters = clusterPoints(points, scene, scene.cols, scene.rows, photos ? 8 : 2.5);
  clustersRef.current = { list: clusters, photos };

  const pinnedLabel = `${points.length} ${points.length === 1 ? 'PIN' : 'PINS'}`;

  return (
    <View style={[styles.panel, { width, height: scene.height }]}>
      <Stars width={innerWidth} height={openHeight} />

      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false}>
            {lines.map((line, r) => (
              <Row key={r} line={line} top={r * CELL} />
            ))}
            {clusters.map((cluster) => (
              <Pin key={cluster.id} cluster={cluster} photos={photos} />
            ))}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      <View style={styles.label} pointerEvents="none">
        <Text style={styles.labelText}>{isOpen ? pinnedLabel : 'WORD MAP'}</Text>
      </View>

      {isOpen ? (
        <>
          <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={close} hitSlop={8}>
            <PixelIcon name="close" size={14} color={COLORS.text} />
          </TouchableOpacity>

          {!selected ? (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.button} onPress={() => zoomBy(2.5)} hitSlop={4}>
                <PixelIcon name="plus" size={14} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => zoomBy(1 / 2.5)} hitSlop={4}>
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
