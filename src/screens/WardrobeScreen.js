import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, COINS, OUTFITS, PET_SPECIES, RADIUS, SHADOW } from '../config';
import { PixelPanel, PixelButton } from '../components/UI';
import { useAlert } from '../components/PixelAlert';
import { refreshWidget } from '../services/widgetService';
import PetSprite from '../components/PetSprite';
import PixelIcon from '../components/PixelIcon';
import {
  getPetState,
  setPetSpecies,
  buyOutfit,
  equipOutfit,
  addCoins,
} from '../services/storageService';

export default function WardrobeScreen({ navigation }) {
  const showAlert = useAlert();
  const [state, setState] = useState(null);
  // The outfit currently shown on the stage — lets users try before buying.
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    const petState = await getPetState();
    setState(petState);
    setPreview((p) => p ?? petState.equippedOutfit);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!state) {
    return <View style={styles.container} />;
  }

  const previewId = preview ?? state.equippedOutfit;
  const previewOutfit = OUTFITS.find((o) => o.id === previewId) || OUTFITS[0];
  const previewOwned = state.ownedOutfits.includes(previewId);
  const previewEquipped = state.equippedOutfit === previewId;

  const handleSpecies = async (species) => {
    if (species === state.species) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await setPetSpecies(species);
    load();
    refreshWidget();
  };

  // Tapping a card only tries the outfit on; wearing/buying happens
  // via the explicit stage button below.
  const handleTryOn = (outfit) => {
    Haptics.selectionAsync().catch(() => {});
    setPreview(outfit.id);
  };

  const handleWear = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await equipOutfit(previewId);
    load();
    refreshWidget();
  };

  const handleBuy = () => {
    if (state.coins < previewOutfit.price) {
      showAlert(
        'Not enough coins',
        `You need ${previewOutfit.price} coins for the ${previewOutfit.name} but only have ${state.coins}. Learn more words or grab a coin pack below!`
      );
      return;
    }
    showAlert(
      `Buy ${previewOutfit.name}?`,
      `${state.name} will wear it right away. This costs ${previewOutfit.price} coins (you have ${state.coins}).`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: `Buy for ${previewOutfit.price} coins`,
          onPress: async () => {
            const result = await buyOutfit(previewId);
            if (result.ok) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              load();
              refreshWidget();
            }
          },
        },
      ]
    );
  };

  const handleCoinPack = async (pack) => {
    // In production this would go through App Store / Google Play billing.
    showAlert(
      'Buy coins',
      `Get ${pack.coins} coins for $${pack.price.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            await addCoins(pack.coins);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            load();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.titleBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <PixelIcon name="arrowLeft" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>WARDROBE</Text>
          <View style={styles.coinChip}>
            <PixelIcon name="coin" size={14} color={COLORS.sun} light={COLORS.surface} />
            <Text style={styles.coinChipText}>{state.coins}</Text>
          </View>
        </View>

        {/* Try-on stage */}
        <PixelPanel tone="panel" style={styles.stage}>
          <View style={styles.skyStrip} />
          <PetSprite
            mood="content"
            species={state.species}
            outfit={previewId}
            pixelSize={10}
          />
          <Text style={styles.petName}>{state.name}</Text>
          {previewId !== 'none' ? (
            <Text style={styles.tryingText}>
              {previewEquipped ? 'WEARING' : 'TRYING ON'}: {previewOutfit.name.toUpperCase()}
            </Text>
          ) : null}
          {!previewEquipped ? (
            previewOwned ? (
              <PixelButton
                label={previewId === 'none' ? 'Take outfit off' : 'Wear it'}
                icon="check"
                color={COLORS.leaf}
                style={styles.stageBtn}
                onPress={handleWear}
              />
            ) : (
              <PixelButton
                label={`Buy for ${previewOutfit.price} coins`}
                icon="coin"
                color={COLORS.primary}
                style={styles.stageBtn}
                onPress={handleBuy}
              />
            )
          ) : null}
        </PixelPanel>

        {/* Species picker */}
        <Text style={styles.sectionTitle}>YOUR BUDDY</Text>
        <View style={styles.speciesRow}>
          {PET_SPECIES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.speciesCard, state.species === s.id && styles.cardSelected]}
              onPress={() => handleSpecies(s.id)}
            >
              <PetSprite mood="content" species={s.id} pixelSize={4} animate={false} />
              <Text style={styles.speciesName}>{s.name.toUpperCase()}</Text>
              {state.species === s.id ? (
                <View style={styles.equippedBadge}>
                  <PixelIcon name="check" size={10} color="#FBF3E0" />
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* Outfits */}
        <Text style={styles.sectionTitle}>OUTFITS</Text>
        <View style={styles.outfitGrid}>
          {OUTFITS.map((outfit) => {
            const owned = state.ownedOutfits.includes(outfit.id);
            const equipped = state.equippedOutfit === outfit.id;
            const trying = previewId === outfit.id;
            return (
              <TouchableOpacity
                key={outfit.id}
                style={[styles.outfitCard, trying && styles.cardSelected]}
                onPress={() => handleTryOn(outfit)}
              >
                <PetSprite
                  mood="content"
                  species={state.species}
                  outfit={outfit.id}
                  pixelSize={3}
                  animate={false}
                />
                <Text style={styles.outfitName}>{outfit.name.toUpperCase()}</Text>
                {equipped ? (
                  <Text style={styles.outfitStatus}>WEARING</Text>
                ) : owned ? (
                  <Text style={styles.outfitStatus}>OWNED</Text>
                ) : (
                  <View style={styles.priceTag}>
                    <PixelIcon name="coin" size={12} color={COLORS.sun} light={COLORS.surface} />
                    <Text style={styles.priceText}>{outfit.price}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Coin packs */}
        <Text style={styles.sectionTitle}>NEED MORE COINS?</Text>
        <PixelPanel style={styles.earnCard}>
          <Text style={styles.earnText}>
            Earn {COINS.perWord} coins per word learned, plus a {COINS.goalBonus} coin bonus for
            hitting your daily goal.
          </Text>
        </PixelPanel>
        <View style={styles.packsRow}>
          {COINS.packs.map((pack) => (
            <TouchableOpacity
              key={pack.id}
              style={styles.packCard}
              onPress={() => handleCoinPack(pack)}
            >
              <PixelIcon name="coin" size={18} color={COLORS.sun} light={COLORS.surface} />
              <Text style={styles.packCoins}>{pack.coins}</Text>
              <Text style={styles.packPrice}>${pack.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <PixelButton
          label="Back to my buddy"
          icon="heart"
          color={COLORS.leaf}
          style={styles.cta}
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 18,
    paddingTop: 60,
    paddingBottom: 130,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    padding: 7,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: COLORS.surface,
  },
  coinChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  stage: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 18,
    overflow: 'hidden',
  },
  skyStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: COLORS.sky,
    opacity: 0.4,
  },
  petName: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 12,
    letterSpacing: 1,
  },
  tryingText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  stageBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 10,
  },
  speciesRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  speciesCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    ...SHADOW.soft,
  },
  cardSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: `${COLORS.sun}22`,
  },
  speciesName: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
    marginTop: 8,
  },
  equippedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.leaf,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    padding: 3,
  },
  outfitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  outfitCard: {
    width: '47.5%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    ...SHADOW.soft,
  },
  outfitName: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.6,
    marginTop: 8,
  },
  outfitStatus: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.leafDark,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  earnCard: {
    marginBottom: 12,
  },
  earnText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
    lineHeight: 18,
  },
  packsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  packCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    ...SHADOW.soft,
  },
  packCoins: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 6,
  },
  packPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
  },
  cta: {
    marginTop: 2,
  },
});
