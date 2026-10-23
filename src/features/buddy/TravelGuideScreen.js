import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { JOURNEY } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import {
  BackButton,
  PixelButton,
  PixelIcon,
  PixelPanel,
  PixelSprite,
  ShareSheet,
} from '../../components';
import { getPet } from '../../services/petService';
import {
  currentIsland,
  getJourneyState,
  haloDaysLeft,
  markPlaceSeen,
} from '../../services/progressService';
import { speakWord } from '../../utils/audio';
import { selectFeedback, tapFeedback } from '../../utils/haptics';
import { ISLAND_GRID, ISLAND_PALETTES, ISLAND_STAND_ROW, PROPS, ZONES, zoneIndexOf } from './journey/seaArt';

/**
 * The travel guide behind the pin on the home map: where the buddy is, what
 * is special about it and how people say hello there, plus a passport with a
 * stamp for every place reached so far. Stamps open that place's page.
 */

const HERO_PX = 6;
const HERO_PROP_PX = 4;
const STAMP_PX = 2;

export default function TravelGuideScreen({ navigation }) {
  const [journey, setJourney] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pet, setPet] = useState(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    getPet().then(setPet).catch(() => {});
    const j = await getJourneyState();
    const here = ZONES[zoneIndexOf(currentIsland(j))];
    setJourney(j);
    setSelected(here.key);
    markPlaceSeen(here.key);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!journey) return <View style={styles.container} />;

  const island = currentIsland(journey);
  const hereIndex = zoneIndexOf(island);
  const index = Math.max(0, ZONES.findIndex((z) => z.key === selected));
  const place = ZONES[index];
  const isHere = index === hereIndex;
  const next = ZONES[hereIndex + 1];
  const haloDays = haloDaysLeft(journey);
  const lastIsland = (ZONES[index + 1]?.from ?? Infinity) - 1;

  const pick = (key) => {
    selectFeedback();
    setSelected(key);
  };

  const sayHello = () => {
    tapFeedback();
    speakWord(place.hello.word, place.hello.speak);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>TRAVEL GUIDE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* The place itself */}
        <View style={[styles.hero, { backgroundColor: place.water }]}>
          <View style={[styles.heroKicker, { backgroundColor: place.banner }]}>
            <Text style={styles.heroKickerText}>
              {isHere
                ? `YOU ARE HERE · ISLAND ${island}`
                : `STOP ${index + 1} · ISLANDS ${place.from}${
                    Number.isFinite(lastIsland) ? `-${lastIsland}` : '+'
                  }`}
            </Text>
          </View>
          <PlaceDiorama place={place} />
        </View>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.region}>{place.region}</Text>

        <PixelPanel style={styles.panel}>
          <Text style={styles.about}>{place.about}</Text>
        </PixelPanel>

        <Text style={styles.groupTitle}>DID YOU KNOW?</Text>
        <PixelPanel style={styles.panel}>
          {place.facts.map((fact, i) => (
            <View key={fact} style={[styles.fact, i > 0 && styles.factGap]}>
              <PixelIcon name="star" size={12} color={COLORS.sun} style={styles.factIcon} />
              <Text style={styles.factText}>{fact}</Text>
            </View>
          ))}
        </PixelPanel>

        {place.hello ? (
          <>
            <Text style={styles.groupTitle}>SAY HELLO</Text>
            <PixelPanel style={[styles.panel, styles.helloPanel]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.helloWord}>{place.hello.word}</Text>
                {place.hello.romanized || place.hello.meaning ? (
                  <Text style={styles.helloSub}>
                    {[place.hello.romanized, place.hello.meaning && `"${place.hello.meaning}"`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.helloLang}>{place.hello.language.toUpperCase()}</Text>
              </View>
              {place.hello.speak ? (
                <TouchableOpacity
                  style={styles.speak}
                  onPress={sayHello}
                  accessibilityLabel={`Hear "${place.hello.word}"`}
                >
                  <PixelIcon name="sound" size={20} color={COLORS.surface} />
                </TouchableOpacity>
              ) : null}
            </PixelPanel>
          </>
        ) : null}

        {isHere ? (
          <>
            <PixelButton
              label="Share where we are"
              icon="share"
              color={COLORS.water}
              onPress={() => {
                selectFeedback();
                setSharing(true);
              }}
              size="lg"
              style={styles.shareButton}
            />
            <Text style={styles.groupTitle}>NEXT STOP</Text>
            <PixelPanel style={[styles.panel, styles.row]}>
              <PixelIcon name={next ? 'lock' : 'star'} size={18} color={COLORS.textMuted} />
              <Text style={styles.rowText}>
                {next
                  ? `${next.name} - ${next.from - island} more ${
                      next.from - island === 1 ? 'island' : 'islands'
                    }`
                  : 'You have seen every place so far. New ones are on the way!'}
              </Text>
            </PixelPanel>
            <PixelPanel style={[styles.panel, styles.row, haloDays > 0 && styles.haloOn]}>
              <PixelIcon name="star" size={18} color={COLORS.sun} />
              <Text style={styles.rowText}>
                {haloDays > 0
                  ? `Halo glowing - ${haloDays} ${haloDays === 1 ? 'day' : 'days'} left.`
                  : `Every ${JOURNEY.milestoneEvery}th island is a milestone: a golden halo for ${JOURNEY.haloDays} days.`}
              </Text>
            </PixelPanel>
          </>
        ) : null}

        {/* Every place, stamped once reached */}
        <View style={styles.passportHead}>
          <Text style={styles.groupTitle}>PASSPORT</Text>
          <Text style={styles.passportCount}>
            {hereIndex + 1}/{ZONES.length} PLACES
          </Text>
        </View>
        <View style={styles.stamps}>
          {ZONES.map((z, i) => {
            const visited = i <= hereIndex;
            const active = z.key === place.key;
            if (!visited) {
              return (
                <View key={z.key} style={[styles.stamp, styles.stampLocked]}>
                  <View style={styles.stampArt}>
                    <PixelIcon name="lock" size={18} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.stampLockedText}>ISLAND {z.from}</Text>
                </View>
              );
            }
            const prop = PROPS[z.prop];
            return (
              <TouchableOpacity
                key={z.key}
                style={[styles.stamp, { backgroundColor: z.water }, active && styles.stampActive]}
                onPress={() => pick(z.key)}
                accessibilityLabel={z.name}
                accessibilityState={{ selected: active }}
              >
                <View style={styles.stampArt}>
                  <PixelSprite grid={prop.grid} palette={prop.palette} pixelSize={STAMP_PX} />
                </View>
                <Text style={[styles.stampName, { backgroundColor: z.banner }]} numberOfLines={1}>
                  {z.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.footnote}>
          One island for every day you meet your goal. New places are added to the map over time.
        </Text>
      </ScrollView>

      <ShareSheet
        visible={sharing}
        card={{
          kicker: `NOW VISITING · ISLAND ${island}`,
          title: place.name,
          subtitle: place.region,
          caption: place.hello ? `Hello here is "${place.hello.word}"` : null,
          hero: <PlaceDiorama place={place} />,
          heroColor: place.water,
          pet,
          footer: `${pet?.name || 'My buddy'} sailed ${island} ${island === 1 ? 'island' : 'islands'} to get here`,
        }}
        message={`${pet?.name || 'My buddy'} just reached ${place.name} on Voyaword!`}
        onClose={() => setSharing(false)}
        onShared={() => setSharing(false)}
      />
    </View>
  );
}

/** The place's island and landmark, drawn big. */
function PlaceDiorama({ place }) {
  const prop = PROPS[place.prop];
  const islandW = ISLAND_GRID[0].length * HERO_PX;
  const propW = prop.grid[0].length * HERO_PROP_PX;
  const propH = prop.grid.length * HERO_PROP_PX;
  const standY = (ISLAND_STAND_ROW + 1) * HERO_PX;
  const top = Math.max(propH - standY, 0);
  return (
    <View style={{ width: islandW, height: top + ISLAND_GRID.length * HERO_PX }}>
      <PixelSprite
        grid={ISLAND_GRID}
        palette={ISLAND_PALETTES[place.key]}
        pixelSize={HERO_PX}
        style={{ position: 'absolute', left: 0, top }}
      />
      <PixelSprite
        grid={prop.grid}
        palette={prop.palette}
        pixelSize={HERO_PROP_PX}
        style={{ position: 'absolute', left: (islandW - propW) / 2, top: top + standY - propH }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSpacer: { width: 40 },
  content: { padding: 20, paddingBottom: 140 },
  hero: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  heroKicker: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  heroKickerText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
  name: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginTop: 14 },
  region: { fontSize: 13, fontWeight: '800', color: COLORS.textLight, marginTop: 2, letterSpacing: 0.5 },
  panel: { marginTop: 10 },
  shareButton: { marginTop: 18 },
  about: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 21 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginTop: 18,
    marginLeft: 4,
  },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  factGap: { marginTop: 10 },
  factIcon: { marginTop: 3 },
  factText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  helloPanel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helloWord: { fontSize: 24, fontWeight: '900', color: COLORS.primaryDark },
  helloSub: { fontSize: 13, fontWeight: '700', color: COLORS.textLight, marginTop: 2 },
  helloLang: { fontSize: 10, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 6 },
  speak: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.water,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    ...SHADOW.soft,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  haloOn: { backgroundColor: '#FFF4CC' },
  passportHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  passportCount: { fontSize: 11, fontWeight: '900', color: COLORS.textMuted, letterSpacing: 1 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  stamp: {
    width: '30.5%',
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  stampActive: { borderColor: COLORS.sun },
  stampArt: { height: 60, alignItems: 'center', justifyContent: 'center' },
  stampName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  stampLocked: { backgroundColor: COLORS.surfaceAlt, borderStyle: 'dashed', borderColor: COLORS.textMuted },
  stampLockedText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },
  footnote: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
