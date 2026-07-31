import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PRICING } from '../config';
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
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Upgrade to Pro ✨</Text>
        <Text style={styles.subtitle}>
          Unlock unlimited learning and premium features
        </Text>
      </View>

      {/* Cost Breakdown */}
      <View style={styles.costBreakdown}>
        <Text style={styles.costTitle}>📊 Our Cost Per Word</Text>
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
          We charge ${PRICING.perWord}/word to cover costs + continue development 🙏
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
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
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
        <Ionicons name="information-circle-outline" size={18} color={COLORS.textLight} />
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
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  costBreakdown: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  costTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
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
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    paddingTop: 8,
  },
  costTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  costTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  costNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  planCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
  },
  planCardPopular: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  planDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  planPeriod: {
    fontSize: 12,
    color: COLORS.textLight,
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
  },
  packsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  packsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  packsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  packItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  packWords: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  packPrice: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  purchaseButton: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
  },
  bottomPadding: {
    height: 40,
  },
});
