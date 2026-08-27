import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORS, PRICING, RADIUS, SHADOW } from '../config';
import PixelIcon from '../components/PixelIcon';
import { updateSubscription } from '../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SubscriptionScreen({ navigation }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = [
    {
      id: 'per_word',
      name: 'Pay Per Word',
      price: `$${PRICING.perWord}`,
      period: 'per word',
      description: 'Pay only for what you learn',
      features: [
        'No commitment',
        'Buy word packs (10, 50, 100 words)',
        'Never expires',
        'Full features included',
      ],
      packs: [
        { words: 10, price: 0.10 },
        { words: 50, price: 0.45 },
        { words: 100, price: 0.80 },
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
        'Unlimited words',
        'All languages',
        'Pronunciation feedback',
        'Friend collections access',
        'Priority support',
      ],
      popular: true,
    },
    {
      id: 'yearly',
      name: 'Yearly Pro',
      price: `$${PRICING.yearly}`,
      period: 'per year',
      description: 'Best value - save 33%!',
      features: [
        'Everything in Monthly',
        'Save 33% vs monthly',
        'Exclusive sticker frames',
        'Early access to features',
        'Offline mode',
      ],
      popular: false,
      savings: `Save $${((PRICING.monthly * 12) - PRICING.yearly).toFixed(2)}/year`,
    },
  ];

  const handlePurchase = async (plan) => {
    // In production, this would integrate with App Store / Google Play billing
    if (plan.id === 'per_word') {
      // Show word pack selection
      await updateSubscription({
        type: 'per_word',
        wordBalance: 50, // Default pack
      });
    } else if (plan.id === 'monthly') {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await updateSubscription({
        type: 'monthly',
        expiresAt: expiresAt.toISOString(),
      });
    } else if (plan.id === 'yearly') {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await updateSubscription({
        type: 'yearly',
        expiresAt: expiresAt.toISOString(),
      });
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <PixelIcon name="close" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>UPGRADE TO PRO</Text>
        <Text style={styles.subtitle}>
          Unlock unlimited learning and premium features
        </Text>
      </View>

      {/* Cost Breakdown */}
      <View style={styles.costBreakdown}>
        <Text style={styles.costTitle}>OUR COST PER WORD</Text>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>AI Image Recognition:</Text>
          <Text style={styles.costValue}>$0.00007</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>AI Translation + Output:</Text>
          <Text style={styles.costValue}>$0.00006</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Infrastructure & Storage:</Text>
          <Text style={styles.costValue}>$0.00200</Text>
        </View>
        <View style={[styles.costRow, styles.costTotal]}>
          <Text style={styles.costTotalLabel}>Total cost/word:</Text>
          <Text style={styles.costTotalValue}>~$0.0025</Text>
        </View>
        <Text style={styles.costNote}>
          We charge ${PRICING.perWord}/word to cover costs and continue development.
        </Text>
      </View>

      {/* Plans */}
      {plans.map((plan) => (
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
              <Text style={styles.popularText}>MOST POPULAR</Text>
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
              <Text style={styles.planPrice}>{plan.price}</Text>
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
              <Text style={styles.packsTitle}>Word Packs:</Text>
              <View style={styles.packsRow}>
                {plan.packs.map((pack, index) => (
                  <View key={index} style={styles.packItem}>
                    <Text style={styles.packWords}>{pack.words}</Text>
                    <Text style={styles.packPrice}>${pack.price.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Purchase Button */}
      <TouchableOpacity
        style={styles.purchaseButton}
        onPress={() => handlePurchase(plans.find(p => p.id === selectedPlan))}
      >
        <Text style={styles.purchaseButtonText}>
          {selectedPlan === 'per_word' ? 'Buy Word Pack' : 'Subscribe Now'}
        </Text>
      </TouchableOpacity>

      {/* Free tier info */}
      <View style={styles.freeInfo}>
        <PixelIcon name="star" size={14} color={COLORS.textLight} />
        <Text style={styles.freeInfoText}>
          Free tier includes {PRICING.freeWordsPerDay} words per day. No credit card required.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 55,
    left: 20,
    padding: 8,
  },
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
  costBreakdown: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 3,
    borderColor: COLORS.outline,
    ...SHADOW.soft,
  },
  costTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 0.8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  costLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  costValue: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  costTotal: {
    borderTopWidth: 2,
    borderTopColor: COLORS.panel,
    marginTop: 8,
    paddingTop: 8,
  },
  costTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
  },
  costTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  costNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
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
  packWords: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
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
  bottomPadding: {
    height: 40,
  },
});
