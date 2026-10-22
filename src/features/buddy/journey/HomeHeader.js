import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../../theme';
import { PixelIcon } from '../../../components';
import { ZONES, zoneIndexOf } from './seaArt';

/**
 * Duolingo-style status row (streak, coins, today's goal) and, under it, the
 * card that names the place the buddy has reached and what lies ahead.
 */
export function StatsRow({ streak, streakLitToday, coins, wordsToday, dailyGoal }) {
  const goalMet = wordsToday >= dailyGoal;
  return (
    <View style={styles.row}>
      <Stat
        icon="flame"
        color={streakLitToday ? COLORS.streak : COLORS.textMuted}
        light={streakLitToday ? COLORS.sun : COLORS.surfaceAlt}
        value={streak}
        textColor={streakLitToday ? COLORS.streak : COLORS.textMuted}
        label="day streak"
      />
      <Stat icon="coin" color={COLORS.sun} light={COLORS.surface} value={coins} textColor="#B8860B" label="coins" />
      <Stat
        icon={goalMet ? 'check' : 'target'}
        color={goalMet ? COLORS.leaf : COLORS.water}
        light={COLORS.surface}
        value={`${Math.min(wordsToday, dailyGoal)}/${dailyGoal}`}
        textColor={goalMet ? COLORS.leafDark : COLORS.water}
        label="today"
      />
    </View>
  );
}

function Stat({ icon, color, light, value, textColor, label }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <PixelIcon name={icon} size={22} color={color} light={light} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

export function ZoneBanner({ reached, haloDays = 0 }) {
  const z = zoneIndexOf(reached);
  const zone = ZONES[z];
  const next = ZONES[z + 1];
  return (
    <View style={[styles.banner, { backgroundColor: zone.banner }]}>
      <View style={styles.bannerTop}>
        <Text style={styles.bannerKicker}>
          STOP {z + 1} · ISLAND {reached}
        </Text>
        {haloDays > 0 ? (
          <View style={styles.haloChip}>
            <PixelIcon name="star" size={10} color={COLORS.sun} />
            <Text style={styles.haloChipText}>
              HALO · {haloDays} {haloDays === 1 ? 'DAY' : 'DAYS'}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.bannerTitle}>{zone.name}</Text>
      {next ? (
        <Text style={styles.bannerHint}>
          {next.from - reached} more {next.from - reached === 1 ? 'island' : 'islands'} to {next.name}
        </Text>
      ) : (
        <Text style={styles.bannerHint}>You have seen every place so far. More are on the way!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 80, justifyContent: 'center' },
  statValue: { fontSize: 19, fontWeight: '900' },
  banner: {
    marginHorizontal: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerKicker: { fontSize: 11, fontWeight: '900', color: '#FFFFFFBB', letterSpacing: 1.5 },
  haloChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(58,42,26,0.35)',
  },
  haloChipText: { fontSize: 9, fontWeight: '900', color: COLORS.sun, letterSpacing: 1 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  bannerHint: { fontSize: 12, fontWeight: '700', color: '#FFFFFFDD', marginTop: 2 },
});
