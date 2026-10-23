import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Dimensions,
  Linking,
} from 'react-native';
import { PRICING, PRODUCT_TO_PLAN, REFERRAL, ROUTES, TERMS_OF_USE_URL } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { BackButton, PixelIcon, useAlert } from '../../components';
import { isSupabaseConfigured } from '../../services/accountService';
import {
  getSubscription,
  hasPaidPlan,
  redeemPromoCode,
  referralDaysLeft,
} from '../../services/subscriptionService';
import {
  arePacksForSale,
  buyWordPack,
  getStoreProducts,
  isBillingAvailable,
  purchasePlan,
  restorePurchases,
  syncEntitlements,
} from '../../services/purchaseService';
import { errorFeedback, selectFeedback, successFeedback } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLANS = [
  {
    id: 'per_word',
    name: 'Pay Per Word',
    price: `$${PRICING.perWord}`,
    period: 'per word',
    description: 'Pay only for what you learn',
    // Only what the app actually does today - nothing on these lists may be
    // a promise of a feature that does not exist.
    features: [
      'No subscription',
      'Packs of 10, 50 or 100 words',
      'Words never expire',
    ],
    packs: [
      { words: 10, price: 0.20 },
      { words: 50, price: 0.90 },
      { words: 100, price: 1.60 },
    ],
    popular: false,
  },
  {
    id: 'monthly',
    name: 'Monthly Pro',
    price: `$${PRICING.monthly}`,
    period: 'per month',
    description: 'Best for consistent learners',
    features: [
      'Unlimited words every day',
      'Set any daily goal, up to 50',
      'Keep your streak and islands growing',
      'Cancel any time',
    ],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly Pro',
    price: `$${PRICING.yearly}`,
    period: 'per year',
    description: 'Best value - save 37%!',
    features: [
      'Everything in Monthly',
      'Save 37% vs monthly',
    ],
    popular: false,
    savings: `Save $${((PRICING.monthly * 12) - PRICING.yearly).toFixed(2)}/year`,
  },
];

// Kept in its own component so typing a code only re-renders this card - with
// the input state on the screen every keystroke re-rendered all three plan
// cards, which is what made typing and redeeming feel sluggish.
const PromoCard = React.memo(function PromoCard({ subscription, onRedeemed }) {
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  const hasUnlimited = subscription?.type === 'unlimited';

  const handleRedeem = async () => {
    if (redeeming) return;
    Keyboard.dismiss();
    setRedeeming(true);
    try {
      const result = await redeemPromoCode(promoCode);
      setPromoResult(result);
      if (result.ok) {
        setPromoCode('');
        onRedeemed(result.subscription);
        successFeedback();
      } else {
        errorFeedback();
      }
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <View style={styles.promoCard}>
      {hasUnlimited ? (
        <View style={styles.promoActiveRow}>
          <PixelIcon name="check" size={18} color={COLORS.success} />
          <View style={styles.promoActiveText}>
            <Text style={styles.promoActiveTitle}>UNLIMITED PLAN ACTIVE</Text>
            <Text style={styles.promoActiveDetail}>
              Redeemed with code {subscription?.promoCode}. Unlimited words, no expiry.
            </Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.promoTitle}>HAVE A PROMO CODE?</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              value={promoCode}
              onChangeText={(text) => {
                setPromoCode(text);
                if (promoResult) setPromoResult(null);
              }}
              placeholder="ENTER CODE"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
              maxLength={24}
            />
            <TouchableOpacity
              style={[styles.promoButton, !promoCode.trim() && styles.promoButtonDisabled]}
              onPress={handleRedeem}
              disabled={!promoCode.trim() || redeeming}
            >
              <Text style={styles.promoButtonText}>{redeeming ? '...' : 'REDEEM'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      {promoResult ? (
        <Text style={[styles.promoMessage, promoResult.ok ? styles.promoOk : styles.promoError]}>
          {promoResult.message}
        </Text>
      ) : null}
    </View>
  );
});

// The free way to Pro, offered above the paid ones. Shows the invite days to
// come - for a paying member, the ones waiting for the plan to end.
function InviteCard({ subscription, onPress }) {
  const left = referralDaysLeft(subscription);
  const paying = hasPaidPlan(subscription);
  const dayWord = left === 1 ? 'DAY' : 'DAYS';
  return (
    <TouchableOpacity style={styles.inviteCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.inviteIcon}>
        <PixelIcon name="people" size={20} color="#FFFFFF" light={COLORS.berry} />
      </View>
      <View style={styles.inviteTextWrap}>
        <Text style={styles.inviteTitle}>
          {paying
            ? left
              ? `+${left} INVITE ${dayWord} AFTER YOUR PLAN`
              : 'MAKE YOUR PLAN LAST LONGER'
            : left
              ? `PRO FROM INVITES: ${left} ${dayWord} LEFT`
              : 'GET PRO FREE'}
        </Text>
        <Text style={styles.inviteDetail}>
          {paying
            ? `Each pal who joins with your code adds ${REFERRAL.rewardDays} free days after your paid period.`
            : left
              ? `Each pal who joins with your code adds ${REFERRAL.rewardDays} more days.`
              : `Invite a pal and you both get ${REFERRAL.rewardDays} days of Pro.`}
        </Text>
      </View>
      <PixelIcon name="chevron" size={14} color={COLORS.text} />
    </TouchableOpacity>
  );
}

export default function SubscriptionScreen({ navigation }) {
  const showAlert = useAlert();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  // Which word pack is picked. Only means anything while 'per_word' is the
  // selected plan; 50 is the middle pack and the best value per word.
  const [selectedPack, setSelectedPack] = useState(50);
  const [subscription, setSubscription] = useState(null);
  // App Store prices, keyed by plan. Empty until (and unless) they load.
  const [storePrices, setStorePrices] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSubscription().then(setSubscription).catch(() => {});
    // Catch up on anything bought elsewhere — another device, or a reinstall.
    syncEntitlements().then(setSubscription).catch(() => {});
    getStoreProducts()
      .then((products) => {
        const byPlan = {};
        for (const product of products) {
          const plan = PRODUCT_TO_PLAN[product.id];
          if (plan) byPlan[plan] = product.price;
        }
        setStorePrices(byPlan);
      })
      .catch(() => {});
  }, []);

  const handlePurchase = async (plan) => {
    if (busy) return;

    if (plan.id === 'per_word') {
      const pack = plan.packs.find((p) => p.words === selectedPack) || plan.packs[0];
      const result = await buyWordPack(pack.words);
      if (result.status === 'purchased') {
        navigation.goBack();
      } else {
        showAlert(
          'Word packs coming soon',
          "Word packs can't be bought in this version yet. A monthly or yearly plan unlocks unlimited words today."
        );
      }
      return;
    }

    if (!isBillingAvailable()) {
      showAlert(
        'Purchases unavailable',
        "Subscriptions aren't available right now. Please try again later."
      );
      return;
    }

    setBusy(true);
    try {
      const result = await purchasePlan(plan.id);
      if (result.status === 'purchased') {
        successFeedback();
        navigation.goBack();
      } else if (result.status === 'pending') {
        showAlert(
          'Waiting for approval',
          'This purchase needs approval before it goes through. Your plan will unlock as soon as it does.'
        );
      } else if (result.status === 'unavailable') {
        showAlert(
          'Plan unavailable',
          "That plan isn't available from the App Store right now. Please try again later."
        );
      }
      // 'cancelled' is a deliberate choice, not a problem worth an alert.
    } catch (error) {
      errorFeedback();
      showAlert('Purchase failed', error?.message || 'That purchase could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  // People expect this to be a visible, deliberate action — it can prompt for
  // an Apple ID password, so it never runs on its own.
  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { restored, subscription: restoredSub } = await restorePurchases();
      setSubscription(restoredSub);
      showAlert(
        restored ? 'Purchases restored' : 'Nothing to restore',
        restored
          ? 'Your plan is active again on this device.'
          : "We couldn't find a previous purchase on this Apple ID."
      );
    } catch (error) {
      showAlert('Restore failed', error?.message || 'Your purchases could not be restored.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <Text style={styles.title}>UPGRADE TO PRO</Text>
        <Text style={styles.subtitle}>
          Learn as many words a day as you like
        </Text>
      </View>

      {isSupabaseConfigured ? (
        <InviteCard
          subscription={subscription}
          onPress={() => navigation.navigate(ROUTES.INVITE)}
        />
      ) : null}

      {/* Promo code */}
      <PromoCard subscription={subscription} onRedeemed={setSubscription} />

      {/* Plans */}
      {/* Word packs have no App Store product yet: in a release build they
          cannot be bought, so the per-word plan is not offered at all. */}
      {PLANS.filter((plan) => plan.id !== 'per_word' || arePacksForSale()).map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planCard,
            selectedPlan === plan.id && styles.planCardSelected,
            plan.popular && styles.planCardPopular,
          ]}
          onPress={() => setSelectedPlan(plan.id)}
        >
          {plan.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>RECOMMENDED</Text>
            </View>
          )}
          {plan.savings && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>{plan.savings}</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDescription}>{plan.description}</Text>
            </View>
            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>{storePrices[plan.id] || plan.price}</Text>
              <Text style={styles.planPeriod}>{plan.period}</Text>
            </View>
          </View>

          <View style={styles.planFeatures}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <PixelIcon name="check" size={16} color={COLORS.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {plan.packs && (
            <View style={styles.packsContainer}>
              <Text style={styles.packsTitle}>PICK A PACK</Text>
              <View style={styles.packsRow}>
                {plan.packs.map((pack) => {
                  const active = selectedPlan === 'per_word' && selectedPack === pack.words;
                  return (
                    <TouchableOpacity
                      key={pack.words}
                      style={[styles.packItem, active && styles.packItemActive]}
                      onPress={() => {
                        selectFeedback();
                        // Picking a pack is also how you pick this plan —
                        // tapping a size and then having to tap the card too
                        // would be a step nobody expects.
                        setSelectedPlan('per_word');
                        setSelectedPack(pack.words);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.packWords, active && styles.packTextActive]}>
                        {pack.words}
                      </Text>
                      <Text style={[styles.packPrice, active && styles.packTextActiveSoft]}>
                        ${pack.price.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Purchase Button */}
      <TouchableOpacity
        style={[styles.purchaseButton, busy && styles.purchaseButtonBusy]}
        onPress={() => handlePurchase(PLANS.find((p) => p.id === selectedPlan))}
        disabled={busy}
      >
        <Text style={styles.purchaseButtonText}>
          {busy
            ? 'Working...'
            : selectedPlan === 'per_word'
            ? `Buy ${selectedPack} words`
            : 'Subscribe Now'}
        </Text>
      </TouchableOpacity>

      {/* Bought before, or reinstalled? The plan lives on the Apple ID. */}
      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={busy}>
        <Text style={styles.restoreButtonText}>Restore purchases</Text>
      </TouchableOpacity>

      {/* Free tier info */}
      <View style={styles.freeInfo}>
        <PixelIcon name="star" size={14} color={COLORS.textLight} />
        <Text style={styles.freeInfoText}>
          Free tier includes {PRICING.freeWordsPerDay} words per day. No credit card required.
        </Text>
      </View>

      {/* Required next to auto-renewing subscriptions (App Review 3.1.2). */}
      <Text style={styles.legalText}>
        Payment is charged to your Apple ID when you confirm. Monthly and yearly plans renew
        automatically at the same price unless cancelled at least 24 hours before the end of the
        current period. Manage or cancel any time in iPhone Settings → your name → Subscriptions.
      </Text>
      <View style={styles.legalLinks}>
        <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_OF_USE_URL).catch(() => {})}>
          Terms of Use
        </Text>
        <Text style={styles.legalDot}>·</Text>
        <Text style={styles.legalLink} onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}>
          Privacy Policy
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  legalText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 16,
    marginHorizontal: 24,
    marginTop: 14,
    textAlign: 'center',
  },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 },
  legalLink: { fontSize: 12, fontWeight: '800', color: COLORS.water, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: COLORS.textMuted },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerRow: { alignSelf: 'stretch', flexDirection: 'row', marginBottom: 10 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: COLORS.outline,
    ...SHADOW.soft,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.berry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTextWrap: { flex: 1 },
  inviteTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text, letterSpacing: 0.8 },
  inviteDetail: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginTop: 2 },
  promoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 3,
    borderColor: COLORS.outline,
    ...SHADOW.soft,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  promoInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.text,
  },
  promoButton: {
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  promoButtonDisabled: {
    backgroundColor: COLORS.panel,
  },
  promoButtonText: {
    color: '#FBF3E0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  promoMessage: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    lineHeight: 18,
  },
  promoOk: { color: COLORS.success },
  promoError: { color: COLORS.danger },
  promoActiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  promoActiveText: { flex: 1 },
  promoActiveTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.8,
  },
  promoActiveDetail: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 18,
  },
  planCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    borderWidth: 3,
    borderColor: COLORS.outline,
    ...SHADOW.soft,
  },
  planCardSelected: {
    borderColor: COLORS.primaryDark,
    // Solid tint (translucent backgrounds render shadows oddly on iOS).
    backgroundColor: '#FAECCD',
  },
  planCardPopular: {},
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.outline,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  popularText: {
    color: '#FBF3E0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.outline,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  savingsText: {
    color: '#FBF3E0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planName: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },
  planDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: '600',
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  planPeriod: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  planFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  packsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: COLORS.panel,
  },
  packsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textLight,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  packsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  packItem: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 10,
    alignItems: 'center',
  },
  packItemActive: {
    backgroundColor: '#E7F0E1',
    borderColor: COLORS.leafDark,
  },
  packWords: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  packTextActive: { color: '#3F6338' },
  packTextActiveSoft: { color: COLORS.leafDark },
  packPrice: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: '700',
  },
  purchaseButton: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: COLORS.leaf,
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    alignItems: 'center',
    ...SHADOW.glow,
  },
  purchaseButtonBusy: { opacity: 0.6 },
  restoreButton: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textDecorationLine: 'underline',
  },
  purchaseButtonText: {
    color: '#FBF3E0',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  freeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
  freeInfoText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  // The tab bar floats over the scroll view (66pt tall, 24pt off the bottom),
  // so the last row needs to clear it or it can only be read mid-scroll.
  bottomPadding: {
    height: 120,
  },
});
